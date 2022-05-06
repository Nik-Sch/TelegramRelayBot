import { h } from 'https://unpkg.com/preact@latest?module';
import { useState, useEffect } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from "https://unpkg.com/htm@latest/dist/htm.module.js?module";

import toasterRef from '../utils/toaster.global.js';

const html = htm.bind(h);

export default function Receive(props) {
  const [messages, setMessages] = useState([]);
  const [notification, setNotification] = useState();
  const [pageVisible, setPageVisible] = useState(document.visibilityState === 'visible');

  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch(`/relay/messages/${props.chatId}`);
      if (response.ok) {
        const newMessages = await response.json();
        console.log(newMessages);
        if (!pageVisible && newMessages.length > 0) {
          const not = new Notification(`New messages from ${props.chatName}`, {
            body: messages.map(m => m.content).join('\n')
          });
          console.log(not);
          setNotification(not);
        }
        setMessages(messages => [...newMessages, ...messages])
      } else {
        toasterRef.value.show({
          title: 'Message Fetch Error',
          message: await response.text(),
          showCloseButton: true,
          className: 'bg-danger text-white'
        });
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, pageVisible ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [setMessages, pageVisible, setNotification]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(success => {
        console.log(`asked for permission: ${success}`);
      });
    }
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setPageVisible(document.visibilityState === 'visible');
      if (notification && document.visibilityState === 'visible') {
        notification.close();
      }
    }
    document.addEventListener('visibilitychange', handleChange);
    return () => document.removeEventListener('visibilitychange', handleChange);
  }, [notification, setPageVisible]);
  
  return html`
  <h3 class="heading">Incoming messages from ${props.chatName}:</h3>
  <div id='messages' class='messages'>
    ${messages.map(message => html`
      <div class='message'>
        <div class='content'>
          ${message.msg_type === 'photo' && html`
            <img src=${message.file_url}></img>
          `}
          ${message.msg_type === 'file' && html`
          <a
            href=${message.file_url}
            target='_blank'
          >
            ${message.file_name}
          </a>
          `}
          <div class='text'>${message.text}</div>
        </div>
        <div class='date'>${new Date(message.date).toLocaleString()}</div>
      </div>`
    )}
  </div>`
}