import { h, Component } from 'https://unpkg.com/preact@latest?module';
import { useEffect, useState} from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from "https://unpkg.com/htm@latest/dist/htm.module.js?module";

const html = htm.bind(h);

import { createPortal } from '../utils/portals.js';


function SingleToast({
  title,
  message,
  showCloseButton = true,
  className = '',
  onDismiss
}) {
  // 'showing', 'show', 'hiding', 'hide'
  const [state, setState] = useState('showing');

  const closeButton = showCloseButton && 
  html`<button
    type="button"
    class="btn-close me-2 m-auto ${ title ? '' : 'btn-close-white'}"
    aria-label="Close"
    onClick=${() => setState('hiding')}
  />`;

  useEffect(() => {
    const t = {
      'showing': () => setTimeout(() => setState('show'), 150),
      'show': () => setTimeout(() => setState('hiding'), 5000),
      'hiding': () => setTimeout(() => setState('hide'), 150),
      'hide': () => setTimeout(() => onDismiss(), 0)
    }[state]();
    return () => {
      clearTimeout(t);
    }
  }, [state]);

  const animClass = {
    'showing': 'show showing',
    'show': 'show',
    'hiding': 'show showing',
    'hide': ''
  }[state];

  return createPortal(html`
  <div class='toast ${animClass} fade ${className}'>
    ${title &&
      html`<div class='toast-header'>
        <strong class='me-auto'>${title}</strong>
        ${closeButton}
      </div>`}
    <div class='d-flex'>
      <div class='toast-body'>
        ${message}
      </div>
      ${!title && closeButton}
    </div>
  </div>`, document.getElementById('modals'));
}


export class Toaster extends Component {
  toastId = 0;

  constructor() {
    super();
    this.state = { toasts: [] };
  }

  show(toast) {
    const newToastId = this.toastId++;
    toast = {
      ...toast,
      key: newToastId,
      onDismiss: () => {
        this.setState(state => ({
          toasts: state.toasts.filter(t => t.key !== newToastId)
        }));
      }
    };
    this.setState(state => ({ toasts: [toast, ...state.toasts] }));
  }

  render() {
    return html`
      ${this.state.toasts.map(t => html`<${SingleToast} ...${t}/>`)}
    `;
  }
}