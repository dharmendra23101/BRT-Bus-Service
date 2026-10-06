import { useCallback, useEffect, useId, useState } from "react";
import { CheckCircle, Edit2, Loader, Search, Shield, TrendingUp, Users, X } from "lucide-react";
import {
  AUDIT_ACTION_LABELS,
  MAX_AUDIT_RECORDS,
  fetchAuditLog,
  type AuditRecord,
} from "@/services/auditService";
import { useAuth } from "@/contexts/AuthContext";
import { toSafeMessage } from "@/domain/auth/errors";
import { useTranslation } from "@/contexts/LocaleContext";
import type { TranslationKey } from "@/domain/i18n/en";
import { PERMISSIONS, can } from "@/domain/auth/permissions";
import {
  MAX_USERS_PER_READ,
  fetchAllUsers,
  updateUserRole,
} from "@/services/userService";
import {
  USER_ROLES,
  type TimestampLike,
  type UserRecord,
  type UserRole,
} from "@/types/user";

import AnnouncementManager from "./AnnouncementManager";
import FleetStatus from "./FleetStatus";

interface AdminDashboardProps {
  onError?: (error: string) => void;
}

const ROLE_LABELS: Record<UserRole, TranslationKey> = {
  user: "admin.role.user",
  driver: "admin.role.driver",
  admin: "admin.role.admin",
};

const AdminDashboard = ({ onError }: AdminDashboardProps) => {
  const { t } = useTranslation();
  const { user, actor, refreshUserRecord } = useAuth();

  const mayViewPanel = can(actor, PERMISSIONS.VIEW_ADMIN_PANEL);
  const mayAssignRoles = can(actor, PERMISSIONS.ASSIGN_ROLES);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRecord[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>("user");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [truncated, setTruncated] = useState(false);

  const searchId = useId();

  const loadUsers = useCallback(async () => {
    setLoading(true);

    try {
      const roster = await fetchAllUsers(actor);
      setAllUsers(roster.users);
      setFilteredUsers(roster.users);
      setTruncated(roster.truncated);
      setError("");
    } catch (err) {
      const message = t(toSafeMessage(err, "error.loadUsers"));
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [actor, onError, t]);

  useEffect(() => {
    if (!mayViewPanel) {
      setLoading(false);
      return;
    }

    void loadUsers();
  }, [mayViewPanel, loadUsers]);

  /*
    Read once on open rather than subscribed. The log only changes when
    somebody on this screen does something, and a live listener on an
    append-only collection would cost a connection to watch for changes this
    page itself causes.
  */
  useEffect(() => {
    if (!mayViewPanel) return;

    void fetchAuditLog(actor).then(setAuditLog);
  }, [mayViewPanel, actor]);

  // Search functionality
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(
        (u) =>
          (u.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const formatJoinedDate = (timestamp?: TimestampLike): string => {
    if (!timestamp) return "N/A";

    try {
      return timestamp.toDate().toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  const startEdit = (userId: string, currentRole: UserRole) => {
    setEditingUserId(userId);
    setEditingRole(currentRole);
    setError("");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingUserId(null);
    setEditingRole("user");
    setError("");
  };

  // Save role change
  const saveRoleChange = async (userId: string) => {
    if (!editingRole) {
      setError(t("admin.role.selectFirst"));
      return;
    }

    if (!mayAssignRoles) {
      setError(t("admin.role.noPermission"));
      return;
    }

    setSaving(true);

    try {
      const result = await updateUserRole(actor, userId, editingRole);

      if (!result.ok) {
        setError(result.message);
        onError?.(result.message);
        return;
      }

      const updatedUsers = allUsers.map((entry) =>
        entry.uid === userId ? { ...entry, role: editingRole } : entry
      );

      setAllUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      setSuccess(t("admin.role.updated"));
      setEditingUserId(null);
      setEditingRole("user");

      setTimeout(() => setSuccess(""), 3000);

      // Demoting yourself must take effect immediately: a Firestore write
      // does not fire the auth listener, so the session would otherwise keep
      // the admin panel and admin privileges until a full reload.
      if (userId === user?.uid) await refreshUserRecord();
    } catch (err) {
      const message = t(toSafeMessage(err, "error.updateRole"));
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "driver":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-accent text-primary-deep border-primary/40";
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "👨‍💼";
      case "driver":
        return "🚌";
      default:
        return "👤";
    }
  };

  // Calculate stats
  const stats = {
    total: allUsers.length,
    admins: allUsers.filter((u) => u.role === "admin").length,
    drivers: allUsers.filter((u) => u.role === "driver").length,
    users: allUsers.filter((u) => u.role === "user").length,
  };

  if (!mayViewPanel) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-8 text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-destructive">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Administrator Panel</h1>
        </div>
        <p className="text-gray-600">
          {t("admin.welcome", {
            name: user?.displayName || t("admin.defaultName"),
          })}
        </p>
      </div>

      <FleetStatus users={allUsers} loading={loading} />

      <AnnouncementManager />

      {/* Admin Info Card */}
      <div className="bg-white rounded-xl p-6 shadow-lg mb-8 border-l-4 border-blue-600">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Full Name</p>
            <p className="text-lg font-semibold text-gray-900">{user?.displayName || "Admin"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Email</p>
            <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Role</p>
            <p className="text-lg font-semibold text-destructive">Administrator</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="w-12 h-12 text-primary opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Drivers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.drivers}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-destructive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-3xl font-bold text-gray-900">{stats.admins}</p>
            </div>
            <Shield className="w-12 h-12 text-destructive opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Passengers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.users}</p>
            </div>
            <Users className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center justify-between"
        >
          <span className="text-destructive">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-destructive hover:text-destructive"
          >
            <X className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">Dismiss error message</span>
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
          <span className="text-green-600">{success}</span>
        </div>
      )}

      {/* User Management Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t("admin.refresh")}
            </button>
          </div>

          {/*
            Granting the driver role here is only half of enabling a driver.
            The Realtime Database gates every position write on an allowlist of
            driver UIDs, and that node is deliberately unwritable by every
            client - it is a list of people, so publishing it would recreate
            the personal-data problem the public map avoids. Saying nothing
            here is how an administrator ends up believing they have enabled
            somebody who cannot broadcast at all.
          */}
          <div
            role="note"
            className="mb-4 rounded-lg border border-primary/30 bg-accent px-4 py-3"
          >
            <p className="text-sm text-primary-deep">
              <strong>{t("admin.allowlist.lead")}</strong>{" "}
              {t("admin.allowlist.body")} <code>driverAllowlist</code>{" "}
              {t("admin.allowlist.rest")}
            </p>
          </div>

          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              {t("admin.searchLabel")}
            </label>
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              placeholder={t("admin.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Result count, announced as the search narrows. */}
          <p className="sr-only" role="status" aria-live="polite">
            {t("admin.shown", {
              shown: filteredUsers.length,
              total: allUsers.length,
            })}
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center" role="status" aria-live="polite">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" aria-hidden="true" />
            <p className="text-gray-600">Loading users…</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" aria-hidden="true" />
            <p className="text-gray-600 font-medium">
              {searchTerm
                ? t("admin.noMatch", { query: searchTerm })
                : t("admin.noUsers")}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="mt-3 text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
              >
                {t("admin.clearSearch")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">
                {t("admin.roster")}
              </caption>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Joined date</th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th scope="col" className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, index) => (
                  <tr key={u.uid} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold">
                          {getRoleIcon(u.role)}
                        </div>
                        <span className="text-gray-900 font-medium">
                          {u.name || u.email?.split("@")[0] || t("admin.unknownUser")}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">{u.email || "N/A"}</td>

                    <td className="px-6 py-4 text-gray-600">
                      {formatJoinedDate(u.createdAt)}
                    </td>

                    <td className="px-6 py-4">
                      {editingUserId === u.uid ? (
                        <select
                          value={editingRole}
                          aria-label={`Role for ${u.name || u.email || "this user"}`}
                          onChange={(e) => {
                            // Narrowed against the registry rather than cast,
                            // so a tampered DOM cannot inject a role value.
                            const next = USER_ROLES.find(
                              (candidate) => candidate === e.target.value
                            );
                            if (next) setEditingRole(next);
                          }}
                          className="px-3 py-1 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {USER_ROLES.map((option) => (
                            <option key={option} value={option}>
                              {t(ROLE_LABELS[option])}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${getRoleColor(
                            u.role
                          )}`}
                        >
                          {getRoleIcon(u.role)}{" "}
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {editingUserId === u.uid ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveRoleChange(u.uid)}
                              disabled={saving}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
                            >
                              {t(saving ? "admin.saving" : "admin.save")}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-semibold disabled:opacity-50"
                            >
                              {t("action.cancel")}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(u.uid, u.role)}
                            disabled={!mayAssignRoles}
                            className="flex items-center gap-2 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Edit2 className="w-4 h-4" aria-hidden="true" />
                            {t("admin.edit")}
                            {/* Every row's button would otherwise read as "Edit". */}
                            <span className="sr-only">
                              {" "}
                              role for {u.name || u.email || "this user"}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {!loading && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-center text-gray-700">
            Showing <span className="font-bold">{filteredUsers.length}</span> of{" "}
            <span className="font-bold">{allUsers.length}</span> users
          </p>

          {/*
            A truncated roster must never look complete: the counts above and
            the statistics cards describe only what was loaded.
          */}
          {truncated && (
            <p className="text-center text-amber-700 text-sm mt-2">
              {t("admin.truncated", { limit: MAX_USERS_PER_READ })}
            </p>
          )}
        </div>
      )}

      {/*
        The record of administrative acts, made readable.

        A write-only log is half a feature: it satisfies the rule that says
        nothing may be rewritten, and answers nobody's question. This is the
        only place in the app where "who changed this account's access, and
        when?" can be asked at all.
      */}
      {mayViewPanel && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("admin.audit.heading")}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t("admin.audit.body", { limit: MAX_AUDIT_RECORDS })}
            </p>
          </div>

          {auditLog.length === 0 ? (
            /*
              Distinct from "could not load": nothing has been recorded is a
              true and ordinary state for a fresh deployment, and showing an
              error there would send somebody looking for a fault.
            */
            <p className="px-6 py-8 text-center text-gray-500">
              {t("admin.audit.none")}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {auditLog.map((record) => (
                <li key={record.id} className="px-6 py-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {AUDIT_ACTION_LABELS[record.action]
                      ? t(AUDIT_ACTION_LABELS[record.action])
                      : record.action}
                  </span>{" "}
                  <span className="text-gray-600">{record.subject}</span>
                  {record.detail && (
                    <span className="text-gray-500"> — {record.detail}</span>
                  )}
                  <span className="block text-xs text-gray-400 mt-0.5">
                    by {record.actorUid}
                    {/*
                      A record whose timestamp has not resolved yet is real,
                      not broken. Rendering a missing value as the epoch would
                      date an administrative act to 1970.
                    */}
                    {record.at ? ` · ${record.at.toLocaleString()}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
