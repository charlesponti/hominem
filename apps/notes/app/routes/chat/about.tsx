import type { MetaArgs } from 'react-router';

export function meta(_args: MetaArgs) {
  return [{ title: 'About' }, { name: 'description', content: 'About this application' }];
}

export default function About() {
  return (
    <div className="about-page">
      <h2>About This App</h2>
      <p>This is a simple application built with React, Vite, and React Router.</p>
    </div>
  );
}
