import { defineStrings } from './define';

export const system = defineStrings({
  en: {
    'boot.lines': '[ OK ] Starting relmymathieu.service...\n[ OK ] Mounting ~/works\n[ OK ] Mounting ~/blog\nrelmymathieu@web login: ready',
    'boot.lastLogin': 'last login: {date}',
    'boot.firstLogin': 'last login: never',
    'login.never': 'last login: never. welcome.',
    'login.back': 'last login: {date}. welcome back.',
    'login.regular': "last login: {date}. you're a regular now.",
    'notFound.title': 'Not found',
    'notFound.error': 'bash: {path}: No such file or directory',
    'notFound.hint': "that page doesn't exist. maybe it never did.",
    'notFound.home': 'cd ~',
  },
  'fr-fr': {
    'boot.lines': '[ OK ] Démarrage de relmymathieu.service...\n[ OK ] Montage de ~/works\n[ OK ] Montage de ~/blog\nrelmymathieu@web login : prêt',
    'boot.lastLogin': 'dernière connexion : {date}',
    'boot.firstLogin': 'dernière connexion : jamais',
    'login.never': 'dernière connexion : jamais. bienvenue.',
    'login.back': 'dernière connexion : {date}. re-bienvenue.',
    'login.regular': "dernière connexion : {date}. tu es un habitué maintenant.",
    'notFound.title': 'Introuvable',
    'notFound.error': 'bash : {path} : Aucun fichier ou dossier de ce type',
    'notFound.hint': "cette page n'existe pas. elle n'a peut-être jamais existé.",
    'notFound.home': 'cd ~',
  },
});
