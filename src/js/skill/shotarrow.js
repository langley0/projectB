
import SkillBase from "./skillbase";
import { TARGETING_TYPE, FRAME_PER_SEC } from "../battledeclare";

export default class ShotArrow extends SkillBase {
    constructor(data) {
        super(TARGETING_TYPE.ENEMY_BACK_CARRY);
        this.setSkillData(data);

        this.tweens = new Tweens();
        this.updater = new Updater();
    }

    onFrame(frame) {
        // 프레임별로 실행해야 할 내용을 여기에 기록
        switch(frame) {
            case 1: {
                this.owner.animation_attack();
                break;
            }
            case 40: {
                Sound.playSound('arrow_shot_1.wav', { singleInstance: true });
                const arrow = this.addEffect(this.owner, { name: 'arrow.png', animation: false, removeFrame: 60 });

                let toX = this.target.position.x + this.target.width / 2;
                let toY = this.target.position.y - this.target.height - 24;
                toX += ((this.target.animation.offset && this.target.animation.offset.x)?this.target.animation.offset.x:0) * this.target.animation.scale.x;
                toY -= ((this.target.animation.offset && this.target.animation.offset.y)?(this.target.animation.offset.y):0) * this.target.animation.scale.y;
                
                const duration = 25;

                const dist = {
                    x: toX - arrow.position.x,
                    y: toY - arrow.position.y
                };

                const gravity = 1;

                const speed = {
                    x: dist.x / duration,
                    y: (dist.y / duration) - ((duration-1)/2*gravity)
                }

                this.updater.add(duration, () => {
                    arrow.position.x += speed.x;
                    arrow.position.y += speed.y;
                    arrow.rotation = Math.atan2(speed.y, speed.x);

                    speed.y += gravity;
                });

                this.tweens.addTween(arrow, 0.1, { alpha: 0 }, duration / FRAME_PER_SEC, "easeOut", true );
                break;
            }
            case 65: {
                Sound.playSound('arrow_shot_hit_1.wav', { singleInstance: true });
                this.addEffect(this.target, { name: 'shoted', animation: true, animationLength: 18, removeFrame: 60, speed: 0.5 });
                let damage = this.calcSkillExpressions(this.owner, this.skillExpressions[0]);

                this.hit(damage, this.target, this.isCritical(this.owner.critical));
                break;
            }
            case 80: {
                this.owner.animation_idle();
            }
            case 85: {
                this.done();
                break;
            }
        }

        this.tweens.update();
        this.updater.update();
    }
}