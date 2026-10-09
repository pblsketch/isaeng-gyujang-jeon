'use strict';
// 도트 그림 자리(임시). 화풍을 고르기 전이라 그림 파일이 없다(spec 13절): img가 없으면 엔진이 코드로 그린다.
//  - 사람(sp_…): 단색 사람 모양(색은 js/data/people.js의 color). alpha로 비치게(혼).
//  - 소품(pr_…): shape로 고른 단순한 도형. w·h는 픽셀(한 칸 32px), flat:true면 바닥에 깔림(부딪히지 않음),
//    light:[반지름, 높이 비율]이면 밤에 빛을 낸다. color로 주된 색을 바꾼다.
//  그림이 생기면 { img:'assets/…png', w, h, foot, cols, fw, fh, px, py, anims }(형제 게임 도구가 만드는 꼴)로 바꿔 끼운다.
window.SPRITES = Object.assign(window.SPRITES || {}, {
  // 사람
  sp_choi: {},
  sp_choi_hon: { alpha: 0.62 },
  sp_isaeng: {},
  sp_hyanga: {},
  sp_choi_father: {},
  sp_choi_mother: {},
  sp_maepa: {},
  sp_servant: {},
  sp_bandit: {},
  // 소품
  pr_willow: { shape: 'willow', w: 64, h: 80 },
  pr_tree: { shape: 'tree', w: 48, h: 64 },
  pr_pavilion: { shape: 'pavilion', w: 96, h: 80 },
  pr_house: { shape: 'house', w: 96, h: 80 },
  pr_swing: { shape: 'swing', w: 48, h: 56 },
  pr_flowers: { shape: 'flowers', w: 64, h: 32, flat: true },
  pr_rock: { shape: 'rock', w: 40, h: 32 },
  pr_mound: { shape: 'mound', w: 56, h: 40 },
  pr_lantern: { shape: 'lantern', w: 16, h: 40, light: [56, 0.3] },
  pr_box: { shape: 'box', w: 32, h: 32 },
});
