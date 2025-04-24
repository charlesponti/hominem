"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Layout;
var Navbar_1 = require("@/components/Navbar");
var theme_provider_1 = require("@/components/ui/theme-provider");
var auth_context_1 = require("@/lib/supabase/auth-context");
var react_router_1 = require("react-router");
function Layout() {
    return (<auth_context_1.AuthProvider>
      <theme_provider_1.ThemeProvider defaultTheme="cosmic-noir">
        <div className="min-h-screen bg-base-100 text-base-content flex flex-col">
          <Navbar_1.Navbar />
          <main className="container mx-auto px-4 py-6 flex-grow">
            <react_router_1.Outlet />
          </main>
          <footer className="footer footer-center p-4 bg-base-200 text-base-content">
            <aside>
              <p>Copyright © {new Date().getFullYear()} - All rights reserved</p>
            </aside>
          </footer>
        </div>
      </theme_provider_1.ThemeProvider>
    </auth_context_1.AuthProvider>);
}
