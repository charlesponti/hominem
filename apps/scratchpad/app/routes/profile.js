"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = meta;
exports.default = Auth;
var protected_route_1 = require("@/components/auth/protected-route");
var profile_1 = require("@/components/profile");
// Using the proper parameter name without destructuring
function meta(args) {
    return [
        { title: 'Log In', foo: 'bar' },
        { name: 'description', content: 'Authentication demonstration page' },
    ];
}
function Auth() {
    return (<protected_route_1.ProtectedRoute>
      <profile_1.Profile />
    </protected_route_1.ProtectedRoute>);
}
