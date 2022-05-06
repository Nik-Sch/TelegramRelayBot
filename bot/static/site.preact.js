
import { h, render } from 'https://unpkg.com/preact@latest?module';
import { useState } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from "https://unpkg.com/htm@latest/dist/htm.module.js?module";

import Send from './components/Send.js';
import Receive from './components/Receive.js';
import { Toaster } from './components/Toast.js';
import toasterRef from './utils/toaster.global.js';

const html = htm.bind(h);

function App(props) {
  const setRef = (ref) => toasterRef.value = ref;

  return html`
  <div class='container'>
    <${Toaster} ref=${setRef}/>
    <h1 class="heading">Send a message to the chat with ${props.chatName}:</h1>
    <${Send} ...${props}/>
    <${Receive} ...${props}/>
  </div>`
}

render(html`
<${App}
  chatName=${CHAT_NAME}
  chatId=${CHAT_ID}
/>`, document.getElementById('app'));