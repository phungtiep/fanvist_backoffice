import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import LoginPage from "./pages/Login";
import RoutesAdmin from "./pages/RoutesAdmin";
import CarsAdmin from "./pages/CarsAdmin";
import BookingsAdmin from "./pages/BookingsAdmin";
import DriversAdmin from "./pages/DriversAdmin";
import VehiclesAdmin from "./pages/VehiclesAdmin";
import ScheduleCalendar from "./components/ScheduleCalendar";
import DriverSalaryAdmin from "./pages/DriverSalaryAdmin";
import RevenueDashboard from "./pages/RevenueDashboard";
import DriverLogin from "./pages/DriverLogin";
import DriverDashboard from "./pages/DriverDashboard";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login admin */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/driver-login" element={<DriverLogin />} />
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
          <Route path="/admin/schedule" element={<ScheduleCalendar />} />
          {/* Admin dashboard */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="routes" element={<RoutesAdmin />} />
                    <Route path="cars" element={<CarsAdmin />} />
                    <Route path="bookings" element={<BookingsAdmin />} />
                    {/* Sau này thêm: cars, bookings, drivers... */}
                    <Route
                      path="*"
                      element={<Navigate to="/admin/routes" replace />}
                    />
                    <Route path="drivers" element={<DriversAdmin />} />
                    <Route path="vehicles" element={<VehiclesAdmin />} />
                    <Route path="driver-salary" element={<DriverSalaryAdmin />} />
                    <Route path="revenue" element={<RevenueDashboard />} />


                  </Routes>


                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirect mặc định */}
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
