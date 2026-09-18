<script>
addEventListener('load',()=>{const out=[];
document.querySelectorAll('*').forEach(e=>{const cs=getComputedStyle(e);
 if(['hidden','clip'].includes(cs.overflow)||['hidden','clip'].includes(cs.overflowY)){
  if(e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1){
   const f=e.closest('.frame');const cap=f?f.querySelector('.cap')?.textContent:'';
   out.push(cap+' | '+e.className+' '+e.scrollHeight+'>'+e.clientHeight+' w'+e.scrollWidth+'>'+e.clientWidth)}}});
 document.body.setAttribute('data-clip',out.join(' ;; ')||'NONE');});
</script>
