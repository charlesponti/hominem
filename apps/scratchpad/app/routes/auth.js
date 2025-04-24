"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = meta;
exports.default = Auth;
var auth_app_1 = require("app/components/auth/auth-app");
// Using the proper parameter name without destructuring
function meta(args) {
    return [
        { title: 'Log In', foo: 'bar' },
        { name: 'description', content: 'Authentication demonstration page' },
    ];
}
function Auth() {
    return <auth_app_1.AuthApp />;
}
