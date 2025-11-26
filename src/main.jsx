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


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login admin */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Admin dashboard */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="routes" element={<RoutesAdmin />} />
                    <Route path="cars" element={<CarsAdmin />} />
                    {/* Sau này thêm: cars, bookings, drivers... */}
                    <Route
                      path="*"
                      element={<Navigate to="/admin/routes" replace />}
                    />
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
