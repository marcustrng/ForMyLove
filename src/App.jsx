import {useEffect, useState} from 'react'
import './App.css'

function App() {
  const [textPosition] = useState({x: 0, y: 0});

  useEffect(() => {

    /*
 * Settings
 */
    const settings = {
      particles: {
        length: 3500, // maximum amount of particles
        duration: 2.5, // particle duration in sec
        velocity: 136, // particle velocity in pixels/sec
        effect: -0.95, // play with this for a nice effect
        size: 13, // particle size in pixels
      },
    };

    /*
     * RequestAnimationFrame polyfill by Erik Möller
     */
    (function () {
      let b = 0;
      const c = ["ms", "moz", "webkit", "o"];
      for (let a = 0; a < c.length && !window.requestAnimationFrame; ++a) {
        window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"];
        window.cancelAnimationFrame = window[c[a] + "CancelAnimationFrame"]
            || window[c[a] + "CancelRequestAnimationFrame"]
      }
      if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (h) {
          const d = new Date().getTime();
          const f = Math.max(0, 16 - (d - b));
          const g = window.setTimeout(function () {
            h(d + f)
          }, f);
          b = d + f;
          return g
        }
      }
      if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (d) {
          clearTimeout(d)
        }
      }
    }());

    /*
     * Point class
     */
    const Point = (function () {
      function Point(x, y) {
        this.x = (typeof x !== 'undefined') ? x : 0;
        this.y = (typeof y !== 'undefined') ? y : 0;
      }

      Point.prototype.clone = function () {
        return new Point(this.x, this.y);
      };
      Point.prototype.length = function (length) {
        if (typeof length == 'undefined') {
          return Math.sqrt(this.x * this.x + this.y * this.y);
        }
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
      };
      Point.prototype.normalize = function () {
        const length = this.length();
        this.x /= length;
        this.y /= length;
        return this;
      };
      return Point;
    })();

    /*
     * Particle class
     */
    const Particle = (function () {
      function Particle() {
        this.position = new Point(0, 0);
        this.velocity = new Point(0, 0);
        this.acceleration = new Point(0, 0);
        this.age = 0;
      }

      Particle.prototype.initialize = function (x, y, dx, dy) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.acceleration.x = dx * settings.particles.effect;
        this.acceleration.y = dy * settings.particles.effect;
        this.age = 0;
      };
      Particle.prototype.update = function (deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.age += deltaTime;
      };
      Particle.prototype.draw = function (context, image) {
        function ease(t) {
          return (--t) * t * t + 1;
        }

        const size = image.width * ease(this.age / settings.particles.duration);
        context.globalAlpha = 1 - this.age / settings.particles.duration;
        context.drawImage(image, this.position.x - size / 2,
            this.position.y - size / 2, size, size);
      };
      return Particle;
    })();

    /*
     * ParticlePool class
     */
    const ParticlePool = (function () {
      let particles,
          firstActive = 0,
          firstFree = 0,
          duration = settings.particles.duration;

      function ParticlePool(length) {
        // create and populate particle pool
        particles = new Array(length);
        for (let i = 0; i < particles.length; i++) {
          particles[i] = new Particle();
        }
      }

      ParticlePool.prototype.add = function (x, y, dx, dy) {
        particles[firstFree].initialize(x, y, dx, dy);

        // handle circular queue
        firstFree++;
        if (firstFree === particles.length) {
          firstFree = 0;
        }
        if (firstActive === firstFree) {
          firstActive++;
        }
        if (firstActive === particles.length) {
          firstActive = 0;
        }
      };
      ParticlePool.prototype.update = function (deltaTime) {
        let i;

        // update active particles
        if (firstActive < firstFree) {
          for (i = firstActive; i < firstFree; i++) {
            particles[i].update(deltaTime);
          }
        }
        if (firstFree < firstActive) {
          for (i = firstActive; i < particles.length; i++) {
            particles[i].update(deltaTime);
          }
          for (i = 0; i < firstFree; i++) {
            particles[i].update(deltaTime);
          }
        }

        // remove inactive particles
        while (particles[firstActive].age >= duration && firstActive
        !== firstFree) {
          firstActive++;
          if (firstActive === particles.length) {
            firstActive = 0;
          }
        }

      };
      ParticlePool.prototype.draw = function (context, image) {
        let i;
// draw active particles
        if (firstActive < firstFree) {
          for (i = firstActive; i < firstFree; i++) {
            particles[i].draw(context, image);
          }
        }
        if (firstFree < firstActive) {
          for (i = firstActive; i < particles.length; i++) {
            particles[i].draw(context, image);
          }
          for (i = 0; i < firstFree; i++) {
            particles[i].draw(context, image);
          }
        }
      };
      return ParticlePool;
    })();

    /*
     * Putting it all together
     */
    (function (canvas) {
      let context = canvas.getContext('2d'),
          particles = new ParticlePool(settings.particles.length),
          particleRate = settings.particles.length
              / settings.particles.duration, // particles/sec
          time;

      // get point on heart with -PI <= t <= PI
      function pointOnHeart(t) {
        return new Point(
            160 * Math.pow(Math.sin(t), 3),
            110 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10
            * Math.cos(4 * t) + 25
        );
      }

      // creating the particle image using a dummy canvas
      const image = (function () {
        const canvas = document.createElement('canvas'),
            context = canvas.getContext('2d');
        canvas.width = settings.particles.size;
        canvas.height = settings.particles.size;

        // helper function to create the path
        function to(t) {
          const point = pointOnHeart(t);
          point.x = settings.particles.size / 3 + point.x
              * settings.particles.size / 550;
          point.y = settings.particles.size / 3 - point.y
              * settings.particles.size / 550;
          return point;
        }

        // create the path
        context.beginPath();
        let t = -Math.PI;
        let point = to(t);
        context.moveTo(point.x, point.y);
        while (t < Math.PI) {
          t += 0.01; // baby steps!
          point = to(t);
          context.lineTo(point.x, point.y);
        }
        context.closePath();
        // create the fill
        context.fillStyle = '#99ff99';
        context.fill();
        // create the image
        const image = new Image();
        image.src = canvas.toDataURL();
        return image;
      })();

      // render that thing!
      function render() {
        // next animation frame
        requestAnimationFrame(render);

        // update time
        const newTime = new Date().getTime() / 1000,
            deltaTime = newTime - (time || newTime);
        time = newTime;

        // clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // create new particles
        const amount = particleRate * deltaTime;
        for (let i = 0; i < amount; i++) {
          const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
          const dir = pos.clone().length(settings.particles.velocity);
          particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y,
              dir.x, -dir.y);
        }

        // update and draw particles
        particles.update(deltaTime);
        particles.draw(context, image);
      }

      // handle (re-)sizing of the canvas
      function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      window.onresize = onResize;

      // delay rendering bootstrap
      setTimeout(function () {
        onResize();
        render();
      }, 10);
    })(document.getElementById('pinkboard'));
  })

  return (
      <>
        <div style={{
          position: "absolute",
          fontFamily: "cursive",
          fontSize: "50px",
          color: "#ffcc99",
          left: `calc(50% + ${textPosition.x}px)`,
          top: `calc(47% - ${textPosition.y}px)`,
          transform: "translate(-50%, -50%)",
          zIndex: 2
        }}>
          <label>Em ❤️</label>
        </div>
        {/*<audio src="/VeDayNhe.mp3" autoPlay loop/>*/}
        <audio controls src="/VeDayNhe.mp3" autoPlay loop style={{
          position: "absolute",
          left: `calc(50% + ${textPosition.x}px)`,
          top: `calc(47% - ${textPosition.y}px)`,
          transform: "translate(-50%, -50%)",
          width: "20%",
          height : "80%",
          zIndex: 2
        }}/>

        <canvas id="pinkboard">
          <canvas id="pinkboard">
          </canvas>
        </canvas>
      </>
  )
}

export default App
