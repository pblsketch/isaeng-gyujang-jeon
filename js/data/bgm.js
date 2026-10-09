'use strict';
// 배경음 목록(T9가 채운다). 지금은 빈 틀: 곡이 없으면 소리 없이 간다(spec 13절).
//  꼴: BGM = { credit:'…', tracks:{ 장면 id:{ src:'assets/bgm/….mp3', gain:1, from:'출처' } } }
//  장면 자료의 music:'장면 id'가 이 곡을 고른다(G.audio.play). 효과음·합성 음악은 두지 않는다.
window.BGM = window.BGM || { credit: '', tracks: {} };
