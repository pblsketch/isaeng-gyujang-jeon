'use strict';
// 담 앞 순간 다섯(plan 1-2, spec 5-2) — 글은 T2가 채운다. 지금은 빈 틀.
//  꼴: WALLS['w1-poem'] = { act:'act1', means:['mal','si','gyeoldan'], ok:['si'], react:{ mal:{ first, again, hint }, … } }
//      글 한 덩이는 { t, mark, src, status }. 이생의 제안('w3-propose')은 kind:'answer', answers:['stay','entrust']
window.WALLS = window.WALLS || {};
