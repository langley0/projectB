import SkillBase from "./skillbase";
import { CHARACTER_CAMP, TARGETING_TYPE } from "../battledeclare";
import BlinkEffectBuff from "../buff/blinkeffectbuff";

export default class DouobleAttack extends SkillBase {
    constructor(data) {
        super(TARGETING_TYPE.ENEMY_FRONT_TANK);
        this.setSkillData(data);

        this.tweens = new Tweens();
    }

    onFrame(frame) {
        
        // 프레임별로 실행해야 할 내용을 여기에 기록
        switch(frame) {
            case 1: {
                this.setCoolTime();
                const vector = (this.owner.camp === CHARACTER_CAMP.ALLY)?  1 : - 1;
                const toX = this.owner.position.x + 16 * vector;
                const toY = this.owner.position.y - 8 * vector;

                this.originX = this.owner.position.x;
                this.originY = this.owner.position.y;

                this.tweens.addTween(this.owner.position, 0.15, {x: toX, y: toY }, 0, "easeOut", true );
                break;
            }
            case 11: {
                this.owner.animation_shieldAttack();
                break;
            } 
            case 25: {
                // TODO : 데미지 계산 공식을 어디서 가져와야 할까??
                // 추후 slash effect 를 방패타격 이펙트로만 바꿔주면 될듯하다.
                Sound.playSound('shield_attack_1.wav', { singleInstance: true });
                this.addEffect(this.target, { name: 'shieldattack', animation: true, animationLength: 5, removeFrame: 60, speed: 0.2 });
                let damage = this.calcSkillExpressions(this.owner, this.skillExpressions[0]);

                this.hit(damage, this.target, this.isCritical(this.owner.critical));
                break;
            }
            case 50: {
                this.owner.animation_attack();
                break;
            }
            case 79: {
                Sound.randomPlaySound(['slash_1.wav', 'slash_2.mp3', 'slash_3.wav'], { singleInstance: true });
                this.owner.removeBuff("doubleAttack");
                let armor = this.calcSkillExpressions(this.owner, this.skillExpressions[2]);
                this.owner.addBuff("doubleAttack", 10, new BlinkEffectBuff({
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

                // 스턴 버그있어서 우선 수정한다.
                // this.target.addBuff("doubleAttackStun", 5, new BlinkEffectBuff({
                //     abilityOptions: [],
                //     statusOptions: ['stun(10)'],
                //     isAnimation: true,
                //     sprite: 'stun',
                //     animationLength: 109,
                //     loop: true,
                //     speed: 0.5,
                //     offset: {
                //         x: this.target.animation.width / 2,
                //         y: -this.target.animation.height + 10
                //     }
                // }));

                this.addEffect(this.target, { name: 'slash', animation: true, animationLength: 8, removeFrame: 60, speed: 0.5 });
                let damage = this.calcSkillExpressions(this.owner, this.skillExpressions[1]);

                this.hit(damage, this.target, this.isCritical(this.owner.critical));
                break;
            }
            case 104: {
                this.owner.animation_idle();
                break;
            }
            case 105: {
                this.tweens.addTween(this.owner.position, 0.15, { x: this.originX, y: this.originY }, 0, "easeOut", true );
                break;
            }
            case 115: {
                this.done();
                break;
            }
        }

        this.tweens.update();
    }
}