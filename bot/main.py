from flask import Flask, request, render_template, make_response, jsonify
import telegram
import os
from base64 import b64decode

BOT_TOKEN=os.environ.get('BOT_TOKEN') or ''
HOST=os.environ.get('HOST') or ''
CHAT_ID=os.environ.get('CHAT_ID') or ''

app = Flask(__name__, static_url_path='/relay/static/')
bot = telegram.Bot(token=BOT_TOKEN)

@app.route(f'/relay/{BOT_TOKEN}', methods=['GET'])
def get_html():
  return render_template('site.html')

@app.route(f'/relay/{BOT_TOKEN}', methods=['POST'])
def send_message():
  data = request.get_json()
  if not data or not 'text' in data:
    return make_response('', 400)
  if 'image' in data:
    bot.send_photo(chat_id=CHAT_ID, caption=data['text'], photo=b64decode(data['image']))
  else:
    bot.send_message(chat_id=CHAT_ID, text=data['text'])
  return make_response('', 200)

@app.route(f'/relay/telegram/{BOT_TOKEN}', methods=['POST'])
def respond():
  update = telegram.Update.de_json(request.get_json(force=True), bot)
  if update == None:
    return
  chat_id = update.message.chat.id
  msg_id = update.message.message_id
  text = update.message.text.encode('utf-8').decode()
  if text == '/start':
    bot.sendMessage(chat_id=chat_id, text=f'Open {HOST}/relay/{BOT_TOKEN} to send messages :)', reply_to_message_id=msg_id)
  else:
    bot.sendMessage(chat_id=chat_id, text=f'{text}\n{chat_id}', reply_to_message_id=msg_id)
  return 'ok'

# bot.setWebhook(f'{HOST}/relay/telegram/{BOT_TOKEN}')

if __name__ == '__main__':
  app.run(debug=True, port=80, host='0.0.0.0')