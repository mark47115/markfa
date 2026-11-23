from pathlib import Path
import re
import shutil

root = Path('public')
p = root / 'index.html'
s = p.read_text()
s = re.sub(r'(?:AI 활용 |AI )?게임 기획 포트폴리오', 'AI 게임 기획 포트폴리오', s)
s = s.replace('게임 제작·기획 문서', '게임 제작 문서').replace('제작·기획 문서', '게임 제작 문서')
s = re.sub(r'<section class="book-group book-group-planning".*?</section>', '', s, flags=re.S)
s = re.sub(r'<template id="(?:media|brief)-(?:raid|journal)".*?</template>', '', s, flags=re.S)
s = re.sub(r'<details class="ai-check">(?:(?!</details>).)*?/read/journal/.*?</details>', '', s, flags=re.S)
viewer = '''<section id="game-reader" hidden aria-label="게임 제작 문서 열람"><header><strong></strong><button class="switch-doc" type="button">다른 제작 문서</button><button class="close-doc" type="button">문서 목록으로</button></header><div class="frame-host"></div></section>'''
s, count = re.subn(r'<section class="book-sheet".*?</section>', viewer, s, count=1, flags=re.S)
assert count and 'book-group-planning' not in s
s = s.replace('src="interactions.js"','src="interactions.js?v=fold3"')
s = s.replace('</head>', '''<style>#portfolio .book-covers{display:block}#portfolio [hidden]{display:none!important}#game-reader{width:100%;scroll-margin-top:75px}#game-reader header{position:static;display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:#342934;color:#fff}#game-reader button{min-height:44px;color:inherit;background:transparent;border:1px solid currentColor;padding:0 12px;font:inherit;cursor:pointer}#game-reader iframe{display:block;width:100%;height:100%;border:0;background:#f8f5ef}#game-reader{position:absolute;inset:0;z-index:3;isolation:isolate;background:#f8f5ef;overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr)}#game-reader .frame-host{min-height:0}#game-reader header{justify-content:flex-end;gap:8px}#game-reader header strong{margin-right:auto}@media(min-width:821px){#portfolio .book-cover{height:clamp(440px,36vw,560px);aspect-ratio:auto}}</style></head>''')
p.write_text(s)
p = root / 'interactions.js'
s = p.read_text()
start = s.index('  const shelf ='); end = s.index('  const record =',start)
motion = s[s.index('  function slideFromCover('):s.index('  function swapArtwork(')]
s = s[:start] + '''  const covers = document.querySelector('.book-covers');
  const reader = document.querySelector('#game-reader');
  const host = reader.querySelector('.frame-host');
  const exhibition = covers.closest('#portfolio');
  const sheet = reader, slideDuration = 600, slideEase = 'cubic-bezier(.38,0,.18,1)';
''' + motion + '''
  let openerCover, unfolding, closing=false, mouseOpened=false;
  function openGame(cover) {
    const switching = !reader.hidden;
    closing=false;
    openerCover = cover;
    const title = cover.dataset.book === 'tavern' ? 'Tavern Heros' : '게이트 공성전';
    const frame = document.createElement('iframe');
    frame.title = title + ' 제작 문서';
    frame.src = cover.href;
    reader.querySelector('strong').textContent = title;
    host.replaceChildren(frame);
    covers.inert = true;
    reader.hidden = false;
    if(!switching) unfolding = slideFromCover({button:cover});
    else frame.animate([{transform:'translateX(35%)',opacity:0},{transform:'translateX(0)',opacity:1}],{duration:440,easing:slideEase});
    frame.focus({preventScroll:true});
  }
  for (const cover of covers.querySelectorAll('.book-cover')) {
    cover.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); mouseOpened=event.pointerType==='mouse'; openGame(cover);
    });
  }
  function closeGame(){
    if(reader.hidden || closing)return;
    closing=true;
    unfolding.reverse();
    unfolding.finished.then(()=>{
      if(!closing)return;
      reader.hidden=true; covers.inert=false; host.replaceChildren(); unfolding.cancel(); closing=false;
      openerCover.focus({preventScroll:true});
    },()=>{});
  }
  reader.querySelector('.close-doc').addEventListener('click',closeGame);
  reader.querySelector('.switch-doc').addEventListener('click',()=>{if(!closing)openGame([...covers.querySelectorAll('.book-cover')].find(c=>c!==openerCover))});
  exhibition.addEventListener('pointerleave',event=>{
    const box=exhibition.getBoundingClientRect();
    if(mouseOpened && event.pointerType==='mouse' && (event.clientX<box.left || event.clientX>=box.right || event.clientY<box.top || event.clientY>=box.bottom))closeGame();
  });
  const featured = covers.querySelector('.cover-tavern');
  document.querySelectorAll('a[href="#tavern-heros-project"]').forEach(link => link.addEventListener('click', event => {event.preventDefault();openGame(featured)}));
  if(location.hash === '#tavern-heros-project') openGame(featured);
''' + s[end:]
p.write_text(s)
for name in ['tavern','gate']:
    page = root/'read'/name/'index.html'
    page.write_text(page.read_text().replace('</head>', '<style>html,body{overscroll-behavior-y:contain}</style></head>'))
for name in ['raid','journal']:
    shutil.rmtree(root/'read'/name)
