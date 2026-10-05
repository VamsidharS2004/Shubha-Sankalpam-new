const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync("frontend/home.html", "utf8");

// Mock fetch for the API call if it was async, but we use XHR now
class MockXHR {
  open(method, url, async) {
    this.url = url;
  }
  send() {
    if (this.url === '/api/content/all') {
      this.status = 200;
      // hit the real backend or mock it
      // wait, the backend is running on 3000, let's fetch it sync
      const execSync = require('child_process').execSync;
      try {
         this.responseText = execSync('curl -s http://localhost:3000/api/content/all', {encoding: 'utf8'});
      } catch(e) {
         this.responseText = '{"ok":true,"data":{}}';
      }
    }
  }
}

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost:3000/"
});

dom.window.XMLHttpRequest = MockXHR;

// Wait for a second to let scripts execute
setTimeout(() => {
  console.log("Pujas count:", dom.window.pujas ? dom.window.pujas.length : "undefined");
  console.log("Navbar HTML length:", dom.window.document.getElementById('site-navbar').innerHTML.length);
  console.log("Hero slider HTML length:", dom.window.document.querySelector('.hero-slider')?.innerHTML.length);
  
  if (dom.window.errors) {
      console.log("Errors:", dom.window.errors);
  }
}, 2000);
