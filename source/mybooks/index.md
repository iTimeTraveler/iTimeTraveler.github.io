---
date: 2017-07-02 11:30:53
comments: true
---


{% iframe 'library.html' 100% 1900px %}


<script>
function setIframeHeight(iframe) {
	if (iframe) {
		var iframeWin = iframe.contentWindow || iframe.contentDocument.parentWindow;
		if (iframeWin.document.body) {
			iframe.height = iframeWin.document.documentElement.scrollHeight || iframeWin.document.body.scrollHeight;
		}
	}
};


setIframeHeight(document.getElementsByTagName('iframe')[0]);
window.onload = function () {
	setIframeHeight(document.getElementsByTagName('iframe')[0]);
};
</script>