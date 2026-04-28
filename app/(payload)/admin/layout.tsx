/**
 * Payload admin layout — isolated from the public site shell.
 *
 * The (payload) route group keeps Payload's CSS, providers, and chrome
 * separate from the marketing/blog frontend — nothing leaks.
 */
import config from '@/payload.config';
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts';
import type { ServerFunctionClient } from 'payload';
import { importMap } from './importMap';

import '@payloadcms/next/css';

const serverFunction: ServerFunctionClient = async (args) => {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

const Layout = ({ children }: { children: React.ReactNode }) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;
