import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import {
  getMyNotifications,
  markNotificationRead,
  NotificationOut,
} from "../../api/notifications";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";

export const NotificationsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [notifications, setNotifications] = useState<NotificationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const list = await getMyNotifications();
      setNotifications(list);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkRead = async (item: NotificationOut) => {
    if (item.read) return;
    try {
      await markNotificationRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Notifications
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Emergency alerts, donor matches, and verification updates
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Notifications
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                You are all caught up! Match alerts and status changes will arrive here.
              </Text>
            </Card>
          }
          renderItem={({ item }) => {
            const isUnread = !item.read;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleMarkRead(item)}
              >
                <Card
                  variant={isUnread ? "blush" : "default"}
                  style={[
                    styles.notifCard,
                    isUnread && {
                      borderColor: colors.primary,
                      borderWidth: 1.5,
                    },
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.titleRow}>
                      {isUnread && (
                        <View
                          style={[
                            styles.unreadDot,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                      <Text
                        style={[
                          styles.notifTitle,
                          {
                            color: colors.textPrimary,
                            fontWeight: isUnread ? "800" : "600",
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </View>

                    <Badge
                      label={item.priority || "NORMAL"}
                      urgency={
                        item.priority === "emergency"
                          ? ("critical" as any)
                          : item.priority === "high"
                          ? ("urgent" as any)
                          : ("normal" as any)
                      }
                      size="sm"
                    />
                  </View>

                  <Text
                    style={[
                      styles.notifBody,
                      {
                        color: isUnread
                          ? colors.textPrimary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {item.body}
                  </Text>

                  <View style={styles.footerRow}>
                    <Text style={[styles.channelText, { color: colors.textMuted }]}>
                      Channel: {item.channel.toUpperCase()}
                    </Text>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyCard: {
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
  },
  notifCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  notifTitle: {
    fontSize: 15,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  channelText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 11,
  },
});
