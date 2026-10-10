'use strict';
// 게임 안 '만든 사람·출처' 화면의 소재 출처 요약. 배경음 줄은 bgm.js가 sections에 더하고, 글꼴 줄은 아래 CREDITS.fonts.
//  꼴: CREDITS = { sections:[{ title, items:[{ title, by, license, note, src }] }] }
//  만든이 줄과 원문 출처 줄은 js/data/notes.js의 NOTES.credits에 있다(이 파일이 비어 있어도 늘 보인다).
window.CREDITS = window.CREDITS || { sections: [] };

// 글꼴(모두 SIL Open Font License 1.1, 게임에 쓰인 글자만 남긴 부분 글꼴 — credits/fonts.tsv, assets/fonts/OFL.txt)
// 자리 이름을 따로 두어(sections 순번에 기대지 않게) 글 확인 문서에서 자리가 겹치지 않는다
CREDITS.fonts = {
  title: '글꼴',
  items: [
    { title: '고운바탕(Gowun Batang)', by: 'The Gowun Batang Project Authors', license: 'SIL Open Font License 1.1', note: '본문·단추' },
    { title: 'Noto Serif KR · Noto Serif SC', by: 'Google', license: 'SIL Open Font License 1.1', note: '원문 한자' },
    { title: '나눔손글씨 붓(Nanum Brush Script)', by: 'NHN', license: 'SIL Open Font License 1.1', note: '제목·이름' },
  ],
};
