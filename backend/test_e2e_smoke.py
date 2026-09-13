import asyncio
import os
import sys

os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-smoke-test")
sys.path.insert(0, ".")

from mongomock_motor import AsyncMongoMockClient  # noqa: E402
import app.db.mongodb as mongodb_module  # noqa: E402

# Swap the real Motor client for an in-memory mock before anything else imports `db`
mongodb_module.client = AsyncMongoMockClient()
mongodb_module.db = mongodb_module.client["test_db"]

from httpx import ASGITransport, AsyncClient  # noqa: E402
from app.main import app  # noqa: E402
import app.api.routes.auth as auth_module  # noqa: E402
import app.api.routes.donors as donors_module  # noqa: E402
import app.api.routes.blood_requests as requests_module  # noqa: E402
import app.api.routes.hospitals as hospitals_module  # noqa: E402
import app.api.routes.blood_banks as blood_banks_module  # noqa: E402
import app.api.routes.notifications as notifications_module  # noqa: E402
import app.api.routes.ai as ai_module  # noqa: E402
import app.api.routes.admin as admin_module  # noqa: E402
import app.api.deps as deps_module  # noqa: E402

# The route modules imported `db` by reference before we swapped it — rebind them
auth_module.db = mongodb_module.db
donors_module.db = mongodb_module.db
requests_module.db = mongodb_module.db
hospitals_module.db = mongodb_module.db
blood_banks_module.db = mongodb_module.db
notifications_module.db = mongodb_module.db
ai_module.db = mongodb_module.db
admin_module.db = mongodb_module.db
deps_module.db = mongodb_module.db


async def main():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # 1. Register a donor
        r = await c.post("/api/auth/register", json={
            "email": "donor1@test.com", "password": "password123",
            "full_name": "Test Donor", "role": "donor",
        })
        assert r.status_code == 201, r.text
        print("register donor:", r.status_code)

        # 2. Login as donor
        r = await c.post("/api/auth/login", data={"username": "donor1@test.com", "password": "password123"})
        assert r.status_code == 200, r.text
        donor_token = r.json()["access_token"]
        print("login donor:", r.status_code)

        headers = {"Authorization": f"Bearer {donor_token}"}

        # 3. Create donor profile
        r = await c.post("/api/donors/me", headers=headers, json={
            "blood_group": "O+", "city": "Karachi", "phone": "03001234567",
            "emergency_availability": True,
        })
        assert r.status_code == 201, r.text
        donor_id = r.json()["id"]
        print("create donor profile:", r.status_code, "-> eligible:", r.json()["is_eligible"], "status:", r.json()["verification_status"])

        # 4. Donor cannot appear in search yet (not verified)
        r = await c.post("/api/auth/register", json={
            "email": "admin1@test.com", "password": "password123",
            "full_name": "Admin One", "role": "super_admin",
        })
        r = await c.post("/api/auth/login", data={"username": "admin1@test.com", "password": "password123"})
        admin_token = r.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        r = await c.get("/api/donors/search", headers=admin_headers, params={"blood_group": "O+"})
        assert r.status_code == 200, r.text
        assert len(r.json()) == 0, "unverified donor should not appear in search"
        print("search before verify (expect 0):", len(r.json()))

        # 5. A donor (non-staff) is forbidden from verifying — RBAC check
        r = await c.patch(f"/api/donors/{donor_id}/verify", headers=headers, params={"new_status": "verified"})
        assert r.status_code == 403, r.text
        print("donor tries to self-verify (expect 403):", r.status_code)

        # 6. Admin verifies the donor
        r = await c.patch(f"/api/donors/{donor_id}/verify", headers=admin_headers, params={"new_status": "verified"})
        assert r.status_code == 200, r.text
        print("admin verifies donor:", r.status_code, "->", r.json()["verification_status"])

        # 7. Now donor appears in search, and public output has NO phone field
        r = await c.get("/api/donors/search", headers=admin_headers, params={"blood_group": "O+"})
        assert r.status_code == 200, r.text
        results = r.json()
        assert len(results) == 1
        assert "phone" not in results[0], "privacy violation: phone leaked in public search"
        print("search after verify (expect 1, no phone field):", results)

        # 8. Unauthenticated request is rejected
        r = await c.get("/api/donors/search", params={"blood_group": "O+"})
        assert r.status_code == 401, r.text
        print("unauthenticated search (expect 401):", r.status_code)

        # 9. Blood request lifecycle + matching engine
        r = await c.post("/api/auth/register", json={
            "email": "patient1@test.com", "password": "password123",
            "full_name": "Test Patient", "role": "patient_requester",
        })
        r = await c.post("/api/auth/login", data={"username": "patient1@test.com", "password": "password123"})
        patient_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

        # Our verified donor above is O+ in Karachi with emergency_availability=True.
        # O+ can donate to O+/A+/B+/AB+ recipients. Request as A+ recipient in Karachi.
        r = await c.post("/api/requests", headers=patient_headers, json={
            "blood_group": "A+", "units_required": 2, "urgency": "critical",
            "hospital_name": "Civil Hospital Karachi", "contact_phone": "03009876543",
            "city": "Karachi",
        })
        assert r.status_code == 201, r.text
        req_id = r.json()["id"]
        assert r.json()["status"] == "draft"
        print("create request:", r.status_code, "-> status:", r.json()["status"])

        # Another user cannot submit someone else's draft
        r = await c.patch(f"/api/requests/{req_id}/submit", headers=admin_headers)
        assert r.status_code == 403, r.text
        print("non-owner tries to submit (expect 403):", r.status_code)

        r = await c.patch(f"/api/requests/{req_id}/submit", headers=patient_headers)
        assert r.status_code == 200 and r.json()["status"] == "pending_verification", r.text
        print("owner submits:", r.status_code, "-> status:", r.json()["status"])

        # Staff can't skip straight to matching without verifying first
        r = await c.post(f"/api/requests/{req_id}/match", headers=admin_headers)
        assert r.status_code == 409, r.text
        print("match before verify (expect 409):", r.status_code)

        r = await c.patch(f"/api/requests/{req_id}/verify", headers=admin_headers)
        assert r.status_code == 200 and r.json()["status"] == "verified", r.text
        print("staff verifies request:", r.status_code)

        r = await c.post(f"/api/requests/{req_id}/match", headers=admin_headers)
        assert r.status_code == 200, r.text
        matches = r.json()
        assert len(matches) == 1, f"expected 1 compatible verified donor, got {matches}"
        assert "phone" not in matches[0], "privacy violation: phone leaked in match results"
        assert matches[0]["blood_group"] == "O+"  # O+ is compatible with A+ recipient
        print("run matching engine (expect 1 O+ donor matched to A+ request):", matches)

        r = await c.get(f"/api/requests/{req_id}", headers=patient_headers)
        assert r.json()["status"] == "donors_found", r.text
        print("request auto-advanced to donors_found:", r.json()["status"])

        # 9b. Notification Engine: the matched donor should have a real
        # in-app notification waiting, not just a silent DB match record.
        r = await c.get("/api/notifications/me", headers=headers)  # `headers` = donor1's auth
        assert r.status_code == 200, r.text
        notes = r.json()
        assert len(notes) == 1, f"expected 1 notification for matched donor, got {notes}"
        assert notes[0]["status"] == "sent" and notes[0]["read"] is False
        assert "A+" in notes[0]["title"] or "A+" in notes[0]["body"]
        print("donor received real in-app notification:", notes[0]["title"])

        note_id = notes[0]["id"]
        r = await c.patch(f"/api/notifications/{note_id}/read", headers=headers)
        assert r.status_code == 200 and r.json()["read"] is True, r.text
        print("donor marks notification read:", r.json()["read"])

        # A different user cannot mark someone else's notification as read
        r = await c.patch(f"/api/notifications/{note_id}/read", headers=admin_headers)
        assert r.status_code == 404, r.text
        print("non-owner tries to mark another user's notification read (expect 404):", r.status_code)

        # 9c. External channels (SMS/email) are honest about missing credentials —
        # tested directly against the service, since no real Twilio/SMTP creds exist here.
        from bson import ObjectId
        from app.core.notifications.service import attempt_external_notification
        from app.models.notification import NotificationChannel

        sms_result = await attempt_external_notification(
            mongodb_module.db, user_id=ObjectId(), channel=NotificationChannel.SMS,
            to="+923001234567", title="Test", body="Test body",
        )
        assert sms_result["status"] == "failed", sms_result
        assert "TWILIO" in sms_result["body"], sms_result
        print("unconfigured SMS provider correctly reports FAILED, not a fake success:", sms_result["status"])

        r = await c.patch(f"/api/requests/{req_id}/start", headers=admin_headers)
        assert r.status_code == 200 and r.json()["status"] == "in_progress", r.text
        r = await c.patch(f"/api/requests/{req_id}/fulfill", headers=admin_headers)
        assert r.status_code == 200 and r.json()["status"] == "fulfilled", r.text
        print("start -> fulfill:", r.json()["status"])

        # Terminal state: no further transition allowed
        r = await c.patch(f"/api/requests/{req_id}/cancel", headers=admin_headers)
        assert r.status_code == 409, r.text
        print("cancel a fulfilled request (expect 409):", r.status_code)

        # 10. Hospital management
        r = await c.post("/api/auth/register", json={
            "email": "hospstaff1@test.com", "password": "password123",
            "full_name": "Hospital Staffer", "role": "hospital_staff",
        })
        r = await c.post("/api/auth/login", data={"username": "hospstaff1@test.com", "password": "password123"})
        hosp_staff_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

        r = await c.post("/api/hospitals", headers=hosp_staff_headers, json={
            "name": "Civil Hospital Karachi", "city": "Karachi",
            "address": "Baba-e-Urdu Road, Saddar", "contact_phone": "02199201300",
        })
        assert r.status_code == 201, r.text
        hospital_id = r.json()["id"]
        assert r.json()["status"] == "pending"
        print("register hospital:", r.status_code, "-> status:", r.json()["status"])

        # Unverified hospital doesn't show up in public listing
        r = await c.get("/api/hospitals", params={"city": "Karachi"})
        assert r.status_code == 200 and len(r.json()) == 0, r.text
        print("public hospital list before verify (expect 0):", len(r.json()))

        # A hospital-staff account cannot self-verify — only admin can
        r = await c.patch(f"/api/hospitals/{hospital_id}/verify", headers=hosp_staff_headers, params={"new_status": "verified"})
        assert r.status_code == 403, r.text
        print("hospital staff tries self-verify (expect 403):", r.status_code)

        r = await c.patch(f"/api/hospitals/{hospital_id}/verify", headers=admin_headers, params={"new_status": "verified"})
        assert r.status_code == 200 and r.json()["status"] == "verified", r.text
        print("admin verifies hospital:", r.status_code)

        r = await c.get("/api/hospitals", params={"city": "Karachi"})
        assert len(r.json()) == 1, r.text
        print("public hospital list after verify (expect 1):", len(r.json()))

        # 11. Blood bank management + inventory
        r = await c.post("/api/auth/register", json={
            "email": "bbstaff1@test.com", "password": "password123",
            "full_name": "Blood Bank Staffer", "role": "blood_bank_staff",
        })
        r = await c.post("/api/auth/login", data={"username": "bbstaff1@test.com", "password": "password123"})
        bb_staff_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

        r = await c.post("/api/blood-banks", headers=bb_staff_headers, json={
            "name": "Fatimid Foundation Blood Bank", "city": "Karachi",
            "address": "Nazimabad, Karachi", "contact_phone": "02136620881",
        })
        assert r.status_code == 201, r.text
        bank_id = r.json()["id"]
        r = await c.patch(f"/api/blood-banks/{bank_id}/verify", headers=admin_headers, params={"new_status": "verified"})
        assert r.status_code == 200 and r.json()["status"] == "verified", r.text
        print("register + verify blood bank:", r.status_code)

        # Add two inventory batches of O+ (5 units) and one expired-marked A- (3 units)
        r = await c.post(f"/api/blood-banks/{bank_id}/inventory", headers=bb_staff_headers, json={
            "blood_group": "O+", "units": 5,
            "collection_date": "2026-08-01", "expiry_date": "2026-09-15",
        })
        assert r.status_code == 201, r.text
        item1_id = r.json()["id"]

        r = await c.post(f"/api/blood-banks/{bank_id}/inventory", headers=bb_staff_headers, json={
            "blood_group": "O+", "units": 2,
            "collection_date": "2026-08-10", "expiry_date": "2026-09-20",
        })
        assert r.status_code == 201, r.text

        r = await c.post(f"/api/blood-banks/{bank_id}/inventory", headers=bb_staff_headers, json={
            "blood_group": "A-", "units": 3,
            "collection_date": "2026-07-01", "expiry_date": "2026-08-15",
        })
        assert r.status_code == 201, r.text
        item3_id = r.json()["id"]
        print("added 3 inventory batches")

        # Public summary aggregates by blood group, no batch detail
        r = await c.get(f"/api/blood-banks/{bank_id}/inventory/summary")
        assert r.status_code == 200, r.text
        summary = {row["blood_group"]: row["available_units"] for row in r.json()}
        assert summary.get("O+") == 7, f"expected 7 available O+ units, got {summary}"
        assert summary.get("A-") == 3, f"expected 3 available A- units, got {summary}"
        print("public inventory summary (expect O+:7, A-:3):", summary)

        # Mark the A- batch expired; summary should drop it from available totals
        r = await c.patch(
            f"/api/blood-banks/{bank_id}/inventory/{item3_id}",
            headers=bb_staff_headers, params={"new_status": "expired"},
        )
        assert r.status_code == 200 and r.json()["status"] == "expired", r.text
        r = await c.get(f"/api/blood-banks/{bank_id}/inventory/summary")
        summary = {row["blood_group"]: row["available_units"] for row in r.json()}
        assert "A-" not in summary, f"expired batch should not count as available, got {summary}"
        print("after marking A- expired, summary excludes it:", summary)

        # A hospital staffer (not blood bank staff) cannot modify this bank's inventory
        r = await c.post(f"/api/blood-banks/{bank_id}/inventory", headers=hosp_staff_headers, json={
            "blood_group": "B+", "units": 1,
            "collection_date": "2026-08-01", "expiry_date": "2026-09-01",
        })
        assert r.status_code == 403, r.text
        print("hospital staff tries to add inventory (expect 403):", r.status_code)

        # 12. Location & Maps: real geodistance replacing city-string matching
        r = await c.post("/api/auth/register", json={
            "email": "donor2@test.com", "password": "password123",
            "full_name": "Test Donor Two", "role": "donor",
        })
        r = await c.post("/api/auth/login", data={"username": "donor2@test.com", "password": "password123"})
        donor2_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

        # Saddar, Karachi coordinates — ~1km from the request location below
        r = await c.post("/api/donors/me", headers=donor2_headers, json={
            "blood_group": "O+", "city": "Karachi", "phone": "03001112222",
            "latitude": 24.8608, "longitude": 67.0104, "emergency_availability": False,
        })
        assert r.status_code == 201, r.text
        donor2_id = r.json()["id"]
        r = await c.patch(f"/api/donors/{donor2_id}/verify", headers=admin_headers, params={"new_status": "verified"})
        assert r.status_code == 200, r.text

        # Request location ~1.3km away (Empress Market area)
        r = await c.post("/api/requests", headers=patient_headers, json={
            "blood_group": "A+", "units_required": 1, "urgency": "urgent",
            "hospital_name": "Civil Hospital Karachi", "contact_phone": "03009876543",
            "city": "Karachi", "latitude": 24.8531, "longitude": 67.0175,
        })
        assert r.status_code == 201, r.text
        geo_req_id = r.json()["id"]
        await c.patch(f"/api/requests/{geo_req_id}/submit", headers=patient_headers)
        await c.patch(f"/api/requests/{geo_req_id}/verify", headers=admin_headers)

        r = await c.post(f"/api/requests/{geo_req_id}/match", headers=admin_headers)
        assert r.status_code == 200, r.text
        geo_matches = r.json()
        # donor1 (no coordinates) still matches via the city-string fallback;
        # donor2 (with coordinates) should show a real computed distance.
        assert len(geo_matches) == 2, geo_matches
        geo_match = next(m for m in geo_matches if m["donor_id"] == donor2_id)
        assert geo_match["distance_km"] is not None and geo_match["eta_minutes"] is not None, geo_match
        assert 0.5 < geo_match["distance_km"] < 3.0, f"expected ~1-2km, got {geo_match['distance_km']}"
        fallback_match = next(m for m in geo_matches if m["donor_id"] != donor2_id)
        assert fallback_match["distance_km"] is None, "donor1 has no coordinates — should fall back, not fake a distance"
        print(f"real geodistance computed for donor with coords: {geo_match['distance_km']}km, ETA {geo_match['eta_minutes']} min")
        print(f"donor without coords correctly falls back to city-match scoring, no fake distance: {fallback_match['distance_km']}")

        # Staff can also search donors near a point and get sorted real distances
        r = await c.get("/api/donors/search", headers=admin_headers, params={
            "blood_group": "O+", "near_lat": 24.8531, "near_lng": 67.0175, "max_distance_km": 5,
        })
        assert r.status_code == 200, r.text
        near_results = r.json()
        assert len(near_results) >= 1 and near_results[0]["distance_km"] is not None
        assert "latitude" not in near_results[0] and "longitude" not in near_results[0], "privacy violation: raw coordinates leaked"
        print("distance-based donor search (no raw coordinates leaked):", near_results)

        # 13. AI Agent: honest failure when unconfigured, tool guardrails, audit logging
        import os
        os.environ.pop("ANTHROPIC_API_KEY", None)  # ensure it's genuinely unset for this test

        r = await c.post("/api/ai/chat", headers=patient_headers, json={"message": "Can you help me request blood?"})
        assert r.status_code == 503, r.text
        assert "ANTHROPIC_API_KEY" in r.json()["detail"], r.json()
        print("AI chat correctly returns 503 with a clear reason when unconfigured:", r.json()["detail"])

        failed_session = await mongodb_module.db.ai_sessions.find_one({"status": "failed"})
        assert failed_session is not None, "the failed attempt should still be logged for audit"
        print("failed AI session still logged for audit:", failed_session["status"])

        # Tool-level guardrail tests, called directly since no live model is available here
        from app.core.ai.tools import (
            ToolError, create_draft_blood_request, get_compatible_donors,
            get_nearby_donors, search_system_knowledge,
        )
        from app.core.ai.dispatcher import dispatch_tool_call
        from bson import ObjectId as OID

        patient_user = await mongodb_module.db.users.find_one({"email": "patient1@test.com"})
        donor_user = await mongodb_module.db.users.find_one({"email": "donor1@test.com"})
        admin_user = await mongodb_module.db.users.find_one({"email": "admin1@test.com"})

        # Compatibility lookup is a pure, deterministic rule table — no AI decides this
        result = await get_compatible_donors(mongodb_module.db, patient_user, "A+")
        assert set(result["compatible_donor_groups"]) == {"O-", "O+", "A-", "A+"}, result
        print("get_compatible_donors returns the correct fixed rule set:", result["compatible_donor_groups"])

        # A donor (non-staff) cannot use the staff-only nearby-donor search tool
        try:
            await get_nearby_donors(mongodb_module.db, donor_user, "O+", 24.86, 67.01)
            assert False, "should have raised ToolError"
        except ToolError as e:
            print("non-staff blocked from get_nearby_donors tool (guardrail held):", str(e))

        # Admin (staff) can use it
        result = await get_nearby_donors(mongodb_module.db, admin_user, "O+", 24.8531, 67.0175, max_distance_km=5)
        assert result["count"] >= 1, result
        print("staff can use get_nearby_donors, real distances returned:", result["donors"][0])

        # create_draft_blood_request only ever creates a draft — never auto-submits
        draft_result = await create_draft_blood_request(
            mongodb_module.db, patient_user, "B+", 2, "Aga Khan Hospital", "Karachi", "03001112233",
        )
        assert draft_result["status"] == "draft", draft_result
        draft_doc = await mongodb_module.db.blood_requests.find_one({"_id": OID(draft_result["id"])})
        assert draft_doc["status"] == "draft", "AI-created request must stay in draft, never auto-progress"
        print("AI-created request is DRAFT only, never auto-submitted:", draft_doc["status"])

        # A donor account cannot use the request-creation tool (wrong role)
        try:
            await create_draft_blood_request(mongodb_module.db, donor_user, "O+", 1, "X", "Karachi", "0300")
            assert False, "should have raised ToolError"
        except ToolError:
            print("donor account blocked from create_draft_blood_request tool (guardrail held)")

        # FAQ tool: real hit and honest miss
        faq_hit = await search_system_knowledge(mongodb_module.db, patient_user, "how often can i donate")
        assert faq_hit["found"] is True and "90 days" in faq_hit["answer"], faq_hit
        faq_miss = await search_system_knowledge(mongodb_module.db, patient_user, "what is the meaning of life")
        assert faq_miss["found"] is False, faq_miss
        print("FAQ tool: real hit and honest miss (no fabricated answer)")

        # Dispatcher: the allowlist is enforced here, not just in the prompt —
        # a fake tool name is rejected and the attempt is still logged.
        fake_session_id = OID()
        try:
            await dispatch_tool_call(mongodb_module.db, patient_user, fake_session_id, "delete_all_users", {})
            assert False, "should have been blocked"
        except ToolError as e:
            print("dispatcher blocks a non-allowlisted tool name:", str(e))

        blocked_log = await mongodb_module.db.ai_tool_calls.find_one({"tool_name": "delete_all_users"})
        assert blocked_log is not None and blocked_log["success"] is False, blocked_log
        print("blocked tool attempt was still logged for audit (success: False)")

        # A legitimate dispatched call is logged as successful
        await dispatch_tool_call(mongodb_module.db, patient_user, fake_session_id, "get_compatible_donors", {"blood_group": "O+"})
        ok_log = await mongodb_module.db.ai_tool_calls.find_one({"tool_name": "get_compatible_donors", "success": True})
        assert ok_log is not None, "successful tool call should also be logged"
        print("successful tool call logged for audit (success: True)")

        # 14. Admin Dashboard + Analytics — read-only aggregate views
        r = await c.get("/api/admin/dashboard", headers=headers)  # `headers` = donor1, not admin
        assert r.status_code == 403, r.text
        print("non-admin blocked from admin dashboard (expect 403):", r.status_code)

        r = await c.get("/api/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200, r.text
        dash = r.json()
        assert dash["total_donors"] == 2, dash  # donor1 + donor2 created in this test run
        assert dash["verified_donors"] == 2, dash
        assert dash["total_hospitals"] == 1 and dash["verified_hospitals"] == 1, dash
        assert dash["total_blood_banks"] == 1 and dash["verified_blood_banks"] == 1, dash
        # 3 real in-app notifications: 1 from the first match (req_id) + 2 from
        # the geo match (geo_req_id, donor1+donor2) — status stays "sent" even
        # after one was marked read, since read/unread is tracked separately.
        assert dash["notifications_sent"] == 3, dash
        assert dash["notifications_failed"] >= 1, dash  # the unconfigured-SMS test above
        assert dash["ai_sessions_total"] >= 1, dash
        assert dash["ai_tool_calls_blocked"] >= 1, dash
        print("admin dashboard summary matches known seeded state:", dash)

        r = await c.get("/api/admin/analytics/requests", headers=admin_headers)
        assert r.status_code == 200, r.text
        req_analytics = r.json()
        # req_id (fulfilled) + geo_req_id (donors_found) + the AI's draft request = 3
        assert req_analytics["total_requests"] == 3, req_analytics
        assert req_analytics["fulfilled_requests"] == 1, req_analytics
        assert abs(req_analytics["fulfillment_rate_pct"] - 33.3) < 0.5, req_analytics
        assert req_analytics["avg_fulfillment_minutes"] is not None, req_analytics
        print("request analytics correct (1/3 fulfilled ≈ 33.3%):", req_analytics)

        r = await c.get("/api/admin/analytics/donors", headers=admin_headers)
        assert r.status_code == 200, r.text
        donor_analytics = r.json()
        assert donor_analytics["total_donors"] == 2 and donor_analytics["verified_donors"] == 2, donor_analytics
        assert donor_analytics["donors_by_blood_group"].get("O+") == 2, donor_analytics
        print("donor analytics correct:", donor_analytics)

        # 15. Audit Logs — real staff actions get logged, viewable only by admin
        r = await c.get("/api/admin/audit-logs", headers=headers)  # donor, not admin
        assert r.status_code == 403, r.text
        print("non-admin blocked from audit logs (expect 403):", r.status_code)

        r = await c.get("/api/admin/audit-logs", headers=admin_headers, params={"action": "donor.verify"})
        assert r.status_code == 200, r.text
        donor_verify_logs = r.json()
        assert len(donor_verify_logs) >= 1, donor_verify_logs
        assert donor_verify_logs[0]["details"]["new_status"] == "verified", donor_verify_logs
        assert donor_verify_logs[0]["actor_role"] in ("admin", "super_admin"), donor_verify_logs
        print("donor.verify action correctly logged with actor and details:", donor_verify_logs[0])

        r = await c.get("/api/admin/audit-logs", headers=admin_headers, params={"target_type": "blood_request"})
        assert r.status_code == 200, r.text
        request_logs = r.json()
        actions_seen = {log["action"] for log in request_logs}
        assert {"request.verify", "request.fulfill"}.issubset(actions_seen), actions_seen
        print("blood_request lifecycle actions logged:", actions_seen)

        # 16. Security hardening: account lockout, real TOTP MFA, security headers, rate limiting
        r = await c.post("/api/auth/register", json={
            "email": "locktest@test.com", "password": "correctpassword1", "full_name": "Lock Test",
        })
        assert r.status_code == 201, r.text

        for i in range(5):
            r = await c.post("/api/auth/login", data={"username": "locktest@test.com", "password": "wrongpassword"})
            assert r.status_code == 401, r.text
        print("5 failed logins accepted (401 each), account should now be locked")

        r = await c.post("/api/auth/login", data={"username": "locktest@test.com", "password": "correctpassword1"})
        assert r.status_code == 403, r.text
        assert "locked" in r.json()["detail"].lower(), r.json()
        print("account correctly LOCKED even with the right password after 5 failed attempts:", r.json()["detail"])

        # Real TOTP MFA: enroll an admin account, then prove login enforces it
        r = await c.post("/api/auth/login", data={"username": "admin1@test.com", "password": "password123"})
        assert r.status_code == 200, r.text
        admin_token_for_mfa = r.json()["access_token"]
        mfa_headers = {"Authorization": f"Bearer {admin_token_for_mfa}"}

        r = await c.post("/api/auth/mfa/setup", headers=mfa_headers)
        assert r.status_code == 200, r.text
        mfa_secret = r.json()["secret"]
        assert "otpauth://" in r.json()["provisioning_uri"], r.json()
        print("MFA setup returns a real TOTP secret + provisioning URI")

        import pyotp
        totp = pyotp.TOTP(mfa_secret)
        valid_code = totp.now()

        r = await c.post("/api/auth/mfa/verify-setup", headers=mfa_headers, json={"code": "000000"})
        assert r.status_code == 401, r.text
        print("wrong MFA code rejected during setup confirmation (expect 401):", r.status_code)

        r = await c.post("/api/auth/mfa/verify-setup", headers=mfa_headers, json={"code": valid_code})
        assert r.status_code == 200 and r.json()["mfa_enabled"] is True, r.text
        print("MFA enabled after confirming a real generated TOTP code")

        # Now login without MFA code must fail — MFA is genuinely enforced, not just stored
        r = await c.post("/api/auth/login", data={"username": "admin1@test.com", "password": "password123"})
        assert r.status_code == 401 and "MFA code required" in r.json()["detail"], r.text
        print("login without MFA code rejected even with correct password (expect 401):", r.json()["detail"])

        r = await c.post(
            "/api/auth/login", data={"username": "admin1@test.com", "password": "password123"},
            headers={"X-MFA-Code": "000000"},
        )
        assert r.status_code == 401, r.text
        print("login with wrong MFA code rejected (expect 401):", r.status_code)

        r = await c.post(
            "/api/auth/login", data={"username": "admin1@test.com", "password": "password123"},
            headers={"X-MFA-Code": pyotp.TOTP(mfa_secret).now()},
        )
        assert r.status_code == 200, r.text
        print("login with correct real-time TOTP code succeeds")

        # Security headers present on a real response
        r = await c.get("/health")
        assert r.headers.get("x-content-type-options") == "nosniff", dict(r.headers)
        assert r.headers.get("x-frame-options") == "DENY", dict(r.headers)
        assert "Strict-Transport-Security" in r.headers, dict(r.headers)
        print("security headers present on every response:", {
            k: v for k, v in r.headers.items() if k.lower() in
            ("x-content-type-options", "x-frame-options", "strict-transport-security")
        })

        # Rate limiting: hammer login past the configured limit
        from app.core.rate_limit import _reset_for_tests
        _reset_for_tests()
        hit_429 = False
        for i in range(25):
            r = await c.post("/api/auth/login", data={"username": "nobody@test.com", "password": "x"})
            if r.status_code == 429:
                hit_429 = True
                break
        assert hit_429, "expected to hit the rate limit within 25 rapid requests"
        print("rate limiter correctly returns 429 after repeated rapid requests")
        _reset_for_tests()  # don't let this bleed into any test that runs after this point

        print("\nALL FUNCTIONAL TESTS PASSED")


asyncio.run(main())
