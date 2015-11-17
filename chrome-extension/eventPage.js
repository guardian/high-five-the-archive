// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function getOpeningIds() {
  var ids = [];
  try {
    ids = JSON.parse(localStorage.openWhenComplete);
  } catch (e) {
    localStorage.openWhenComplete = JSON.stringify(ids);
  }
  return ids;
}

function setOpeningIds(ids) {
  localStorage.openWhenComplete = JSON.stringify(ids);
}

chrome.downloads.onChanged.addListener(function(delta) {
  if (!delta.state ||
      (delta.state.current != 'complete')) {
    return;
  }
  var ids = getOpeningIds();
  if (ids.indexOf(delta.id) < 0) {
    return;
  }
  chrome.downloads.open(delta.id);
  ids.splice(ids.indexOf(delta.id), 1);
  setOpeningIds(ids);
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {


  var file_id = tab.url.split("docview")[1].split('/')[1];
  var metadataUrl = tab.url.replace('docview', 'citation');
  alert(jQuery.get(metadataUrl));


  chrome.downloads.download({url: info.linkUrl, filename:file_id+'.pdf'}, function(downloadId) {
    var ids = getOpeningIds();
    if (ids.indexOf(downloadId) >= 0) {
      return;
    }
    ids.push(downloadId);
    setOpeningIds(ids);
  });
});

chrome.contextMenus.create({
  id: 'open',
  title: "High five the archive!",
  contexts: ['link']
});
