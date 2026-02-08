function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok', received: data })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
