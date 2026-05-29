import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const storedUser = browser ? JSON.parse(localStorage.getItem('user') || 'null') : null;
const storedToken = browser ? (localStorage.getItem('token') || null) : null;

export const user = writable(storedUser);
export const token = writable(storedToken);

user.subscribe(val => {
	if (browser) localStorage.setItem('user', JSON.stringify(val));
});

token.subscribe(val => {
	if (browser) {
		if (val) localStorage.setItem('token', val);
		else localStorage.removeItem('token');
	}
});
