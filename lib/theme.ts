/**
 * Theme storage key and the pre-paint script (DESIGN.md §3). Plain module, not a client
 * component, so the server layout receives the script as a string: anything exported
 * from a 'use client' file reaches server code as a client reference instead.
 */
export const THEME_KEY = 'nuvoxsaga-theme';

/** Runs inline in <head> before paint: applies a saved dark choice. Light is the default. */
export const THEME_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;
