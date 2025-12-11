import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import AuthProvider from "./context/AuthProvider";
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
import TaxiAdmin from "./pages/TaxiAdmin.jsx";
import TaxiDriverAdmin from "./pages/TaxiDriverAdmin.jsx";
import TaxiDriverLogin from "./pages/TaxiDriverLogin.jsx";
import TaxiDriverReport from "./pages/TaxiDriverReport.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login admin */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/driver-login" element={<DriverLogin />} />
          <Route path="/driver-login-taxi" element={<TaxiDriverLogin />} />

          <Route path="/driver-dashboard" element={<DriverDashboard />} />
          <Route path="/admin/schedule" element={<ScheduleCalendar />} />
          <Route path="/taxi/driver/report" element={<TaxiDriverReport />} />
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
                    <Route path="taxi" element={<TaxiAdmin />} />
                    <Route path="taxi-driver" element={<TaxiDriverAdmin />} />
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
