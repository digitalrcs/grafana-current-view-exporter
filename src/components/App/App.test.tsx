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
        <App
          {...({ meta: { baseUrl: '/grafana/public/plugins/digitalrcs-currentviewexporter-app' } } as AppRootProps)}
        />
      </MemoryRouter>
    );
    expect(screen.queryByRole('heading', { name: 'Grafana Current View Exporter' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Export a dashboard in three steps' })).toBeInTheDocument();
    expect(screen.getByText(/Export current dashboard/)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getAllByRole('img')[0]).toHaveAttribute(
      'src',
      '/grafana/public/plugins/digitalrcs-currentviewexporter-app/img/export-dialog-compact.png'
    );
  });
});
