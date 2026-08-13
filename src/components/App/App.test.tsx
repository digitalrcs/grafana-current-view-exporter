import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import type { AppRootProps } from '@grafana/data';
import App from './App';

jest.mock('@grafana/runtime', () => ({
  PluginPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

describe('Components/App', () => {
  test('explains where the export action is available', () => {
    render(
      <MemoryRouter>
        <App {...({} as AppRootProps)} />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Grafana Current View Exporter' })).toBeInTheDocument();
    expect(screen.getByText(/Export current dashboard/)).toBeInTheDocument();
  });
});
