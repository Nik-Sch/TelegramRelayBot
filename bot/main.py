from email import message
from fileinput import filename
from typing import List, Literal, TypedDict
from typing_extensions import NotRequired
from flask import Flask, request, render_template, make_response, jsonify, send_from_directory, Blueprint
import telegram
import os
from base64 import b64decode
import redis
import json
from pathlib import Path
from uuid import uuid4
from werkzeug.utils import secure_filename
from glob import glob

def raiser(ex): raise ex

BOT_TOKEN = os.environ.get('BOT_TOKEN') or raiser(ValueError('BOT_TOKEN not given'))
HOST = os.environ.get('HOST') or raiser(ValueError('HOST not given'))
FILE_DIRECTORY = os.environ.get('FILE_DIRECTORY') or raiser(ValueError('FILE_DIRECTORY not given'))

URL_PREFIX = 'relay'

bp = Blueprint(URL_PREFIX, __name__)
bot = telegram.Bot(token=BOT_TOKEN)

redisWaitingMessages = redis.StrictRedis(host='redis', port=6379, db=0)

class Message(TypedDict):
  msg_type: Literal['text', 'photo', 'file']
  text: str
  date: str
  file_url: NotRequired[str]
  file_name: NotRequired[str]


@bp.route(f'/files/', methods=['POST'])
def upload_file():
  Path(FILE_DIRECTORY).mkdir(parents=True, exist_ok=True)
  if 'file' not in request.files:
    return make_response('No file', 400)
  f = request.files['file']
  name = f'{uuid4()}_{secure_filename(f.filename or "")}'
  f.save(f'{FILE_DIRECTORY}/{name}')
  return make_response(jsonify({
    'url': f'{request.base_url}{name}'.replace('http', 'https'),
    'file_id': name
    }), 200)



@bp.route(f'/files/<path:file_id>', methods=['GET'])
def get_file(file_id):
  return send_from_directory(FILE_DIRECTORY, file_id)

@bp.route(f'/<chat_id>', methods=['GET'])
def get_html(chat_id):
  chat_name = chat_id
  try:
    chat = bot.get_chat(chat_id=chat_id)
    if chat.title:
      chat_name = chat.title
    elif chat.first_name:
      chat_name = chat.first_name
    elif chat.username:
      chat_name = chat.username
  except Exception as e:
    app.logger.error(e)
    return "<h1>Chat does not exist</h1>"

  return render_template('site.preact.html', chat_id=chat_id, chat_name=chat_name)

@bp.route(f'/messages/<chat_id>', methods=['GET'])
def messages(chat_id):
  if redisWaitingMessages.exists(chat_id):
    result = redisWaitingMessages.get(chat_id)
    redisWaitingMessages.delete(chat_id)
    return make_response(jsonify(json.loads(result or '[]')), 200)
  return make_response(jsonify([]), 200)

@bp.route(f'/messages/<chat_id>', methods=['POST'])
def send_message(chat_id):
  try:
    data = request.get_json()
    if not data:
      return make_response('no data', 400)
    if 'image' in data and 'file' in data:
      f = open(f'{FILE_DIRECTORY}/{data["file"]}', 'rb')
      bot.send_document(chat_id=chat_id, document=f, filename=data['filename'])
      bot.send_photo(chat_id=chat_id, caption=data['text'], photo=b64decode(data['image']))
      f.close()
    elif 'file' in data:
      f = open(f'{FILE_DIRECTORY}/{data["file"]}', 'rb')
      bot.send_document(chat_id=chat_id, document=f, filename=data['filename'], caption=data['text'])
      f.close()
    elif 'image' in data:
      bot.send_photo(chat_id=chat_id, caption=data['text'], photo=b64decode(data['image']))
    elif 'text' in data:
      bot.send_message(chat_id=chat_id, text=data['text'])
    else:
      return make_response('nothing to send in data', 400)

    return make_response('', 200)
  except Exception as e:
    return make_response(str(e), 500)

def create_file(file_id: str) -> str:
  Path(FILE_DIRECTORY).mkdir(parents=True, exist_ok=True)

  tg_file = bot.get_file(file_id=file_id)
  extension = tg_file.file_path.split(".")[-1] or raiser(f'Cannot get extension of {tg_file.file_path}')
  filename = f'{file_id}.{extension}'
  tg_file.download(custom_path=f'{FILE_DIRECTORY}/{filename}')
  app.logger.warning(f'downloaded as {filename}')
  return filename

def addMessage(chat_id: str, message: Message):
  messages: List[Message] = []
  if redisWaitingMessages.exists(chat_id):
    messages = json.loads(redisWaitingMessages.get(chat_id) or '[]')
  messages.insert(0, message)
  redisWaitingMessages.set(chat_id, json.dumps(messages))


@bp.route(f'/telegram/{BOT_TOKEN}', methods=['POST'])
def respond():
  try:
    app.logger.warning(request.url_rule)
    update = telegram.Update.de_json(request.get_json(force=True), bot)
    if update == None:
      return
    chat_id = str(update.message.chat.id)
    msg_id = update.message.message_id

    if update.message.text != None:
      text = update.message.text.encode('utf-8').decode()
      if text.startswith('/start'):
        bot.sendMessage(chat_id=chat_id, text=f'Open {HOST}/{URL_PREFIX}/{chat_id} to send messages :)', reply_to_message_id=msg_id)
      else:
        addMessage(chat_id, {
          'msg_type': 'text',
          'date': update.message.date.isoformat(),
          'text': text.strip()
        })
    elif update.message.photo != None and len(update.message.photo) > 0:
      app.logger.warning(update.message.photo)
      largest_photo = max(update.message.photo, key=lambda p: p.width)
      filename = create_file(largest_photo.file_id)
      addMessage(chat_id, {
        'msg_type': 'photo',
        'date': update.message.date.isoformat(),
        'text': update.message.caption or '',
        'file_url': f'/{URL_PREFIX}/files/{filename}'
      })
    elif update.message.document != None:
      app.logger.warning(f'{update.message.document}')
      upload_name = create_file(update.message.document.file_id)
      addMessage(chat_id, {
        'msg_type': 'file',
        'date': update.message.date.isoformat(),
        'text': update.message.caption or '',
        'file_url': f'/{URL_PREFIX}/files/{upload_name}',
        'file_name': update.message.document.file_name
      })
  except Exception as e:
    app.logger.error(e)
  return 'ok'

@bp.route(f'/webhook', methods=['GET'])
def activate_webhook():
  bot.setWebhook(f'{HOST}/{URL_PREFIX}/telegram/{BOT_TOKEN}')
  return 'ok'

@bp.route(f'/delete_files', methods=['GET'])
def delete_files():
  for f in glob(f'{FILE_DIRECTORY}/*'):
    os.remove(f)
  return 'ok'


app = Flask(__name__, static_url_path=f'/{URL_PREFIX}/static/')
app.register_blueprint(bp, url_prefix=f'/{URL_PREFIX}/')

if __name__ == '__main__':
  app.run(debug=True, port=80, host='0.0.0.0')
