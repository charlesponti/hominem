"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = meta;
exports.default = About;
function meta(args) {
    return [{ title: 'About' }, { name: 'description', content: 'About this application' }];
}
function About() {
    return (<div className="about-page">
      <h2>About This App</h2>
      <p>This is a simple application built with React, Vite, and React Router.</p>
    </div>);
}
