let notification;

window.onload = () => {
  const rte = document.getElementsByClassName('rte')[0]
  const sendButton = document.getElementById('send-button');
  const sendingButton = document.getElementById('sending-button');
  rte.focus();

  let fileToBeSent;

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
      return (await response.json()).url;
    } else {
      document.getElementById('error-message').innerHTML = `Error file upload: ${await response.text()}`;
      const toast = new bootstrap.Toast(document.getElementById('toast-failure'));
      toast.show();
      return undefined;
    }
  }

  async function sendMessage() {
    sendButton.classList.add('no-display');
    sendingButton.classList.remove('no-display');
    console.log('sending');
    const fileUrl = await uploadFile();
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
    const response = await fetch(document.URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendObject)
    });
    if (fileUrl) {
      fileToBeSent = undefined;
      document.getElementsByClassName('file')[0]?.remove();
    }
    sendButton.classList.remove('no-display');
    sendingButton.classList.add('no-display');
    if (response.ok) {
      rte.innerHTML = "";
      const toast = new bootstrap.Toast(document.getElementById('toast-success'));
      toast.show();
    } else {
      document.getElementById('error-message').innerHTML = `Error: ${await response.text()}`;
      const toast = new bootstrap.Toast(document.getElementById('toast-failure'));
      toast.show();
    }
  }

  sendButton.addEventListener('click', sendMessage);
  rte.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      sendMessage();
    }
  });

  rte.addEventListener('dragenter', () => rte.classList.add('dragover'));
  rte.addEventListener('dragleave', () => rte.classList.remove('dragover'));

  rte.addEventListener('drop', (e) => {
    e.preventDefault();
    rte.classList.remove('dragover');
    console.log(e.dataTransfer);
    const items = e.dataTransfer.items;
    if (items.length > 0 && items[0].kind === 'file') {
      fileToBeSent = items[0].getAsFile();
      console.log(fileToBeSent);
      rte.insertAdjacentHTML('afterend', `<div class='file'>
      <i class="bi bi-file-earmark-arrow-up"></i> ${fileToBeSent.name}</div`);
    }
  })


  setInterval(async () => {
    const response = await fetch(`/relay/messages/${location.pathname.split('/').reverse()[0]}`);
    if (response.ok) {
      const messages = await response.json();
      for (const message of messages) {
        document.getElementById('messages').insertAdjacentHTML('afterbegin', `
            <div class='message'>
              <div class='content'>
                ${message.msg_type === 'photo' ? 
               `<img src='${message.file_url}'></img>` : ''}
                ${message.msg_type === 'file' ? 
               `<a
                  href='${message.file_url}'
                  target='_blank'
                >
                  ${message.file_name}
                </a>` : ''}
                <div class='text'>${message.text}</div>
              </div>
              <div class='date'>${message.date}</div>
            </div>`);
      }
      if (messages.length > 0
        && Notification.permission === 'granted'
        && document.visibilityState !== 'visible') {
        if (notification) {
          notification.close();
        }
        notification = new Notification('New messages', {
          body: messages.map(m => m.content).join('\n')
        });
      }
    }
  }, 5 * 1000);

  if (Notification.permission === 'default') {
    Notification.requestPermission().then(success => {
      console.log(`asked for permission: ${success}`);
    });
  }
};
document.addEventListener('visibilitychange', () => {
  if (notification && document.visibilityState === 'visible') {
    notification.close();
  }
})
