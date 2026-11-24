import { mountSettings } from './settings.js';
import { guardHomeDuringExpedition } from '../mobile/run.js';

guardHomeDuringExpedition();

const home = document.querySelector('.home');
mountSettings(document.getElementById('title-settings'), home);

for (const button of home.querySelectorAll('[data-title-dialog]')) {
  const dialog = document.getElementById(button.dataset.titleDialog);
  button.addEventListener('click', () => dialog.showModal());
}
