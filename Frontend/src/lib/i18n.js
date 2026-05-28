import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export const locale = writable(browser ? (localStorage.getItem('locale') || 'de') : 'de');

locale.subscribe(val => {
	if (browser) localStorage.setItem('locale', val);
});

const translations = {
	de: {
		'nav.overview': 'Übersicht',
		'nav.workouts': 'Workouts',
		'nav.stats': 'Statistiken',
		'nav.profile': 'Profil',

		'login.title': 'Einloggen',
		'login.email': 'E-Mail',
		'login.emailPlaceholder': 'deine@email.com',
		'login.password': 'Passwort',
		'login.passwordPlaceholder': 'Dein Passwort',
		'login.submit': 'Einloggen',
		'login.loading': 'Lädt...',
		'login.noAccount': 'Noch kein Account?',
		'login.registerLink': 'Registrieren',
		'login.errorFields': 'Bitte alle Felder ausfüllen',
		'login.errorWrong': 'E-Mail oder Passwort falsch',
		'login.errorNetwork': 'Da ist was schiefgelaufen – versuch es nochmal',

		'register.title': 'Account erstellen',
		'register.name': 'Name',
		'register.namePlaceholder': 'Max Mustermann',
		'register.email': 'E-Mail',
		'register.emailPlaceholder': 'deine@email.com',
		'register.password': 'Passwort',
		'register.passwordPlaceholder': 'Mind. 6 Zeichen',
		'register.confirmPassword': 'Passwort wiederholen',
		'register.confirmPlaceholder': 'Nochmal eingeben',
		'register.submit': 'Registrieren',
		'register.loading': 'Lädt...',
		'register.hasAccount': 'Schon einen Account?',
		'register.loginLink': 'Einloggen',
		'register.errorFields': 'Bitte alle Felder ausfüllen',
		'register.errorPasswords': 'Passwörter stimmen nicht überein',
		'register.errorFailed': 'Registrierung hat nicht geklappt',
		'register.errorNetwork': 'Da ist was schiefgelaufen – versuch es nochmal',

		'dashboard.greeting': 'Guten Tag',
	},
	en: {
		'nav.overview': 'Overview',
		'nav.workouts': 'Workouts',
		'nav.stats': 'Statistics',
		'nav.profile': 'Profile',

		'login.title': 'Log In',
		'login.email': 'Email',
		'login.emailPlaceholder': 'your@email.com',
		'login.password': 'Password',
		'login.passwordPlaceholder': 'Your password',
		'login.submit': 'Log In',
		'login.loading': 'Loading...',
		'login.noAccount': 'No account yet?',
		'login.registerLink': 'Register',
		'login.errorFields': 'Please fill in all fields',
		'login.errorWrong': 'Email or password incorrect',
		'login.errorNetwork': 'Something went wrong – please try again',

		'register.title': 'Create Account',
		'register.name': 'Name',
		'register.namePlaceholder': 'John Doe',
		'register.email': 'Email',
		'register.emailPlaceholder': 'your@email.com',
		'register.password': 'Password',
		'register.passwordPlaceholder': 'At least 6 characters',
		'register.confirmPassword': 'Confirm Password',
		'register.confirmPlaceholder': 'Enter again',
		'register.submit': 'Register',
		'register.loading': 'Loading...',
		'register.hasAccount': 'Already have an account?',
		'register.loginLink': 'Log In',
		'register.errorFields': 'Please fill in all fields',
		'register.errorPasswords': 'Passwords do not match',
		'register.errorFailed': 'Registration failed',
		'register.errorNetwork': 'Something went wrong – please try again',

		'dashboard.greeting': 'Good day',
	}
};

export const t = derived(locale, $locale =>
	(key) => translations[$locale]?.[key] ?? translations.de[key] ?? key
);