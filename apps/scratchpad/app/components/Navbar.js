"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Navbar = Navbar;
var button_1 = require("@/components/ui/button");
var sheet_1 = require("@/components/ui/sheet");
var theme_toggle_1 = require("@/components/ui/theme-toggle");
var auth_context_1 = require("@/lib/supabase/auth-context");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var react_router_1 = require("react-router");
function Navbar() {
    var isAuthenticated = (0, auth_context_1.useAuth)().isAuthenticated;
    return (<framer_motion_1.motion.div className="sticky top-0 z-50 backdrop-blur-xl bg-base-200/70 border-b border-white/10 shadow-lg" initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="container mx-auto navbar py-3">
        <div className="navbar-start">
          <sheet_1.Sheet>
            <sheet_1.SheetTrigger asChild>
              <button_1.Button variant="ghost" size="icon" className="lg:hidden">
                <lucide_react_1.Menu className="h-5 w-5"/>
                <span className="sr-only">Toggle menu</span>
              </button_1.Button>
            </sheet_1.SheetTrigger>
            <sheet_1.SheetContent side="left" className="w-72">
              <nav className="flex flex-col gap-2">
                <framer_motion_1.motion.div className="w-full" whileHover={{ x: 5 }} transition={{ type: 'spring', stiffness: 400 }}>
                  <react_router_1.Link to="/" className="block px-4 py-2 text-sm hover:bg-accent rounded-md">
                    Home
                  </react_router_1.Link>
                </framer_motion_1.motion.div>
                <framer_motion_1.motion.div className="w-full" whileHover={{ x: 5 }} transition={{ type: 'spring', stiffness: 400 }}>
                  <react_router_1.Link to="/about" className="block px-4 py-2 text-sm hover:bg-accent rounded-md">
                    About
                  </react_router_1.Link>
                </framer_motion_1.motion.div>
              </nav>
            </sheet_1.SheetContent>
          </sheet_1.Sheet>

          <react_router_1.Link to="/" className="flex items-center gap-2 group">
            <framer_motion_1.motion.div className="w-9 h-9 bg-gradient-to-bl from-primary to-red-500 rounded-lg grid place-items-center text-white font-bold text-lg shadow-md" whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
              S
            </framer_motion_1.motion.div>
            <framer_motion_1.motion.span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-red-500 hidden sm:inline-block" whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 400 }}>
              Scratchpad
            </framer_motion_1.motion.span>
          </react_router_1.Link>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 flex items-center gap-2">
            <framer_motion_1.motion.li whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400 }}>
              <react_router_1.Link to="/" className="font-medium rounded-full hover:bg-primary/10">
                Home
              </react_router_1.Link>
            </framer_motion_1.motion.li>
            <framer_motion_1.motion.li whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400 }}>
              <react_router_1.Link to="/about" className="font-medium rounded-full hover:bg-primary/10">
                About
              </react_router_1.Link>
            </framer_motion_1.motion.li>
          </ul>
        </div>

        <div className="navbar-end flex gap-2">
          {!isAuthenticated ? (<framer_motion_1.motion.a href="/auth" className="btn btn-sm btn-primary rounded-md px-4 shadow-md hidden md:flex" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              Log in
            </framer_motion_1.motion.a>) : null}
          <theme_toggle_1.ThemeToggle />
        </div>
      </div>
    </framer_motion_1.motion.div>);
}
