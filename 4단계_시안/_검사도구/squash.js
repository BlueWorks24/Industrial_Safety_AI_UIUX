<script>
addEventListener('load',()=>{const out=[];
document.querySelectorAll('.phone *').forEach(e=>{const r=e.getBoundingClientRect();const t=(e.childNodes.length===1&&e.firstChild.nodeType===3)?e.textContent.trim():'';
 const lh=parseFloat(getComputedStyle(e).lineHeight)||16;
 if(t.length>=6 && r.height>lh*3.2 && r.width<120){const f=e.closest('.frame');out.push((f?f.querySelector('.cap').textContent.slice(0,12):'')+' | '+t.slice(0,15)+' w'+Math.round(r.width)+' h'+Math.round(r.height))}});
 document.body.setAttribute('data-squash',out.join(' ;; ')||'NONE');});
</script>
