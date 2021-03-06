import SkillBase from "./skillbase";
import { TARGETING_TYPE } from "../battledeclare";
import BlinkEffectBuff from "../buff/blinkeffectbuff";

export default class Crouch extends SkillBase {
    constructor(data) {
        super(TARGETING_TYPE.ENEMY_FRONT_TANK);
        this.setSkillData(data);

        this.tweens = new Tweens();
    }

    onFrame(frame) {
        // 프레임별로 실행해야 할 내용을 여기에 기록
        switch(frame) {
            case 1: {
                this.owner.animation_idle();
                break;
            }
            case 11: {
                // 버프를 제거하고, 연산해서, 추가한다.
                this.owner.removeBuff("crouch");
                const armor = this.calcSkillExpressions(this.owner, this.skillExpressions[0]);

                this.owner.addBuff("crouch", 20, new BlinkEffectBuff({
                    abilityOptions: [`armor(${armor})`],
                    statusOptions: [],
                    isAnimation: true,
                    sprite: 'barrier',
                    animationLength: 63,
                    loop: true,
                    speed: 0.5,
                    offset: {
                        x: this.owner.animation.width / 2,
                        y: -this.owner.animation.height / 2
                    }
                }));

                this.addFontEffect({target: this.owner, outputText: `Armor ▲`, fontSize: 7});
                this.owner.animation_crouch();
                break;
            }
            case 31: {
                this.done();
                break;
            }
        }

        this.tweens.update();
    }
}