import { h } from 'https://unpkg.com/preact@latest?module';
import { useState, useRef } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from "https://unpkg.com/htm@latest/dist/htm.module.js?module";

import toasterRef from '../utils/toaster.global.js';

const html = htm.bind(h);

export default function Send(props) {
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileToBeSent, setFileToBeSent] = useState();

  let rteRef = useRef();

  async function uploadFile() {
    if (!fileToBeSent) {
      return undefined;
    }
    const formData = new FormData();
    formData.append('file', fileToBeSent);
    const response = await fetch('/relay/files/', {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      return (await response.json()).file_id;
    } else {
      toasterRef.value.show({
        title: 'File Upload Error',
        message: await response.text(),
        showCloseButton: true,
        className: 'bg-danger text-white'
      });
      return undefined;
    }
  }

  const handleSend = async () => {
    setSending(true);
    const fileUrl = await uploadFile();
    const rte = rteRef.current;
    const images = rte.getElementsByTagName('img');
    const sendObject = {
      text: rte.innerText,
      file: fileUrl,
      filename: fileToBeSent?.name
    }
    if (images.length > 0) {
      sendObject.image = images[0].src.split(',')[1];
    }
    console.log(sendObject);
    const response = await fetch(`/relay/messages/${props.chatId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendObject)
    });
    if (response.ok) {
      toasterRef.value.show({
        title: 'Message sent',
        message: 'The message has been sent successfully.',
        showCloseButton: true,
        className: 'bg-success text-white'
      });
    } else {
      toasterRef.value.show({
        title: 'Message Sending Error',
        message: await response.text(),
        showCloseButton: true,
        className: 'bg-danger text-white'
      });
    }
    setFileToBeSent(undefined);
    setSending(false);
    rte.innerHTML = "";
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const items = e.dataTransfer.items;
    if (items.length > 0 && items[0].kind === 'file') {
      setFileToBeSent(items[0].getAsFile());
    }
  }
  const handleKeypress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend();
    }
  }
  return html`
    <div class="send-wrapper">
      <div
        class="rte form-control ${dragging ? 'dragover' : ''}"
        ref=${rteRef}
        contenteditable="true"
        role="textbox"
        spellcheck="true"
        ondragenter=${() => setDragging(true)}
        ondragleave=${() => setDragging(false)}
        ondrop=${handleDrop}
        onkeypress=${handleKeypress}
      />
      ${sending
        ? html`<button
          class="btn btn-primary d-flex align-items-center"
          disabled
        >
          <div class="spinner-border spinner-border-sm m-1" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Sending
        </button>`
        : html`<button
          class="btn btn-primary"
          onClick="${handleSend}"
        >Send</button>`}
      ${fileToBeSent && html`<div class='file' title=${fileToBeSent.name}>
        <i class="bi bi-file-earmark-arrow-up"/>
        <span>${fileToBeSent.name}</span>
      </div>`}
    </div>
  `;
}