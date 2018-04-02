var physics_accuracy = 3,
mouse_influence = 20,
mouse_cut = 5,
gravity = 1200,
cloth_height = 30,
cloth_width = 50,
start_y = 20,
spacing = 7,
tear_distance = 60;

window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
function(callback) {
    window.setTimeout(callback, 1000 / 60);
};

var canvas, ctx, cloth, boundsx, boundsy, mouse = {
    down: false,
    button: 1,
    x: 0,
    y: 0,
    px: 0,
    py: 0
};

var Point = function(x, y) {

    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.vx = 0;
    this.vy = 0;
    this.pin_x = null;
    this.pin_y = null;

    this.constraints = [];
};

Point.prototype.update = function(delta) {

    if (mouse.down) {

        var diff_x = this.x - mouse.x,
        diff_y = this.y - mouse.y,
        dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);

        if (mouse.button == 1) {

            if (dist < mouse_influence) {
                this.px = this.x - (mouse.x - mouse.px) * 1.8;
                this.py = this.y - (mouse.y - mouse.py) * 1.8;
            }

        } else if (dist < mouse_cut) this.constraints = [];
    }

    this.add_force(0, gravity);

    delta *= delta;
    nx = this.x + ((this.x - this.px) * .99) + ((this.vx / 2) * delta);
    ny = this.y + ((this.y - this.py) * .99) + ((this.vy / 2) * delta);

    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.vy = this.vx = 0
};

Point.prototype.draw = function() {

    if (this.constraints.length <= 0)="" return;="" var="" i="this.constraints.length;" while="" (i--)="" this.constraints[i].draw();="" };="" point.prototype.resolve_constraints="function()" {="" if="" (this.pin_x="" !="null" &&="" this.pin_y="" this.x="this.pin_x;" this.y="this.pin_y;" }="" this.constraints[i].resolve();="" (this.x=""> boundsx) {

        this.x = 2 * boundsx - this.x;

    } else if (this.x < 1) {

        this.x = 2 - this.x;
    }

    if (this.y > boundsy) {

        this.y = 2 * boundsy - this.y;

    } else if (this.y < 1) {

        this.y = 2 - this.y;
    }
};

Point.prototype.attach = function(point) {

    this.constraints.push(new Constraint(this, point));
};

Point.prototype.remove_constraint = function(lnk) {

    var i = this.constraints.length;
    while (i--) if (this.constraints[i] == lnk) this.constraints.splice(i, 1);
};

Point.prototype.add_force = function(x, y) {

    this.vx += x;
    this.vy += y;
};

Point.prototype.pin = function(pinx, piny) {
    this.pin_x = pinx;
    this.pin_y = piny;
};

var Constraint = function(p1, p2) {

    this.p1 = p1;
    this.p2 = p2;
    this.length = spacing;
};

Constraint.prototype.resolve = function() {

    var diff_x = this.p1.x - this.p2.x,
    diff_y = this.p1.y - this.p2.y,
    dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
    diff = (this.length - dist) / dist;

    if (dist > tear_distance) this.p1.remove_constraint(this);

    var px = diff_x * diff * 0.5;
    var py = diff_y * diff * 0.5;

    this.p1.x += px;
    this.p1.y += py;
    this.p2.x -= px;
    this.p2.y -= py;
};

Constraint.prototype.draw = function() {

    ctx.moveTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
};

var Cloth = function() {

    this.points = [];

    var start_x = canvas.width / 2 - cloth_width * spacing / 2;

    for (var y = 0; y </=>