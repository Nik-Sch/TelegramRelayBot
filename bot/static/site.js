window.onload = () => {
  const rte = document.getElementsByClassName('rte')[0]
  rte.focus();

  document.getElementById('send-button').onclick = async () => {
    const images = document.getElementsByTagName('img');
    const sendObject = {
      text: rte.innerText
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
    if (response.ok) {
      rte.innerHTML = "";
      const toast = new bootstrap.Toast(document.getElementById('toast-success'));
      toast.show();
    } else {
      const toast = new bootstrap.Toast(document.getElementById('toast-failure'));
      toast.show();

    }
  }
};