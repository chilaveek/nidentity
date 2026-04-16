import { Routes, Route } from "react-router";
import { lazy, Suspense } from "react";
import { UserLayout } from "./components/layouts/UserLayout";
import { AdminLayout } from "./components/layouts/AdminLayout";
import { AuthorLayout } from "./components/layouts/AuthorLayout";
import { RoleGuard } from "./components/guards/RoleGuard";

const HomePage = lazy(() => import("./pages/user/HomePage").then(m => ({ default: m.HomePage })));
const MarketPage = lazy(() => import("./pages/user/MarketPage").then(m => ({ default: m.MarketPage })));
const ProfilePage = lazy(() => import("./pages/user/ProfilePage").then(m => ({ default: m.ProfilePage })));
const UserSupportPage = lazy(() => import("./pages/user/SupportPage").then(m => ({ default: m.UserSupportPage })));

const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage").then(m => ({ default: m.AdminDashboardPage })));
const AdminModerationPage = lazy(() => import("./pages/admin/AdminModerationPage").then(m => ({ default: m.AdminModerationPage })));
const AdminSupportPage = lazy(() => import("./pages/admin/AdminSupportPage").then(m => ({ default: m.AdminSupportPage })));

const AuthorDashboardPage = lazy(() => import("./pages/author/AuthorDashboardPage").then(m => ({ default: m.AuthorDashboardPage })));
const AuthorStatisticsPage = lazy(() => import("./pages/author/AuthorStatisticsPage").then(m => ({ default: m.AuthorStatisticsPage })));
const CreateMerchPage = lazy(() => import("./pages/author/CreateMerchPage").then(m => ({ default: m.CreateMerchPage })));
const AuthorDesignsPage = lazy(() => import("./pages/author/AuthorDesignsPage").then(m => ({ default: m.AuthorDesignsPage })));
const AuthorSupportPage = lazy(() => import("./pages/author/AuthorSupportPage").then(m => ({ default: m.AuthorSupportPage })));


function PageFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{
        width: 32, height: 32,
        border: "4px solid #040055",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

function NotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 500 }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 48, color: "#040055", marginBottom: 8 }}>404</h1>
        <p style={{ fontFamily: "'Inter',sans-serif", color: "#888" }}>Страница не найдена</p>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* User routes */}
      <Route path="/" element={
        <RoleGuard allowedRoles={["User", "Author", "Admin", null]}>
          <UserLayout />
        </RoleGuard>
      }>
        <Route index element={withSuspense(<HomePage />)} />
        <Route path="market" element={withSuspense(<MarketPage />)} />
        <Route path="profile" element={withSuspense(<ProfilePage />)} />
        <Route path="create" element={withSuspense(<CreateMerchPage mode="user" />)} />
        <Route path="support" element={withSuspense(<UserSupportPage />)} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={
        <RoleGuard allowedRoles={["Admin"]}>
          <AdminLayout />
        </RoleGuard>
      }>
        <Route index element={withSuspense(<AdminDashboardPage />)} />
        <Route path="moderation" element={withSuspense(<AdminModerationPage />)} />
        <Route path="support" element={withSuspense(<AdminSupportPage />)} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Author routes */}
      <Route path="/author" element={
        <RoleGuard allowedRoles={["Author", "Admin"]}>
          <AuthorLayout />
        </RoleGuard>
      }>
        <Route index element={withSuspense(<AuthorDashboardPage />)} />
        <Route path="designs" element={withSuspense(<AuthorDesignsPage />)} />
        <Route path="statistics" element={withSuspense(<AuthorStatisticsPage />)} />
        <Route path="support" element={withSuspense(<AuthorSupportPage />)} />
        <Route path="create" element={withSuspense(<CreateMerchPage />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
