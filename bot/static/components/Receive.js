import { h } from 'https://unpkg.com/preact@latest?module';
import { useState, useEffect, useCallback } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from "https://unpkg.com/htm@latest/dist/htm.module.js?module";

import toasterRef from '../utils/toaster.global.js';

const html = htm.bind(h);

export default function Receive(props) {
  const [messages, setMessages] = useState([]);
  const [notification, setNotification] = useState();
  const [refreshing, setRefreshing] = useState(false);
  const [pageVisible, setPageVisible] = useState(document.visibilityState === 'visible');

  const fetchMessages = useCallback(async () => {
    setRefreshing(true);
    const start = Date.now();
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
      const formattedMessages = newMessages.map(message => {
        const matches = [...message.text.matchAll(/(https?:\/\/?)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g)];
        let text = html``;
        let length = 0;
        for (const match of matches) {
          const url = (match.length > 1) && match[1] ? match[0] : `https://${match[0]}`;
          text = html`${text}${message.text.substring(length, match.index)}<a href=${url}>${match[0]}</a>`;
          length += match.index + match[0].length;
        }
        return {
          ...message,
          text
        };
      });
      setMessages(messages => [...formattedMessages, ...messages])
    } else {
      toasterRef.value.show({
        title: 'Message Fetch Error',
        message: await response.text(),
        showCloseButton: true,
        className: 'bg-danger text-white'
      });
    }
    // show at least 750ms of refreshing
    setTimeout(() => setRefreshing(false), 750 - (Date.now() - start));
  }, [props.chatId, props.chatName, setMessages, setNotification, setRefreshing]);

  useEffect(() => {
    if (pageVisible) {
      fetchMessages();
    }
  }, [pageVisible]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(success => {
        console.log(`asked for permission: ${success}`);
      });
    }
  }, []);

  useEffect(() => {
    const onKeydown = (e) => {
      if (e.code === 'KeyR' && !e.ctrlKey && !e.target.className.includes('rte')) {
        e.preventDefault();
        fetchMessages();
      }
    }
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [fetchMessages]);

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
  <div class='receive-heading'>
    <button class='btn btn-primary btn-lg' onClick=${fetchMessages}>
      <i class="bi bi-arrow-clockwise ${refreshing ? 'spin' : ''}"></i>
      Refresh
    </button>
    <h3 class="heading">Incoming messages from ${props.chatName}:</h3>
  </div>
  <div id='messages' class='messages'>
    ${messages.map(message => html`
    <div class='message'>
      <div class='content'>
        ${message.msg_type === 'photo' && html`
        <img src=${message.file_url}></img>
        `}
        ${message.msg_type === 'file' && html`
        <a href=${message.file_url} target='_blank'>
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
