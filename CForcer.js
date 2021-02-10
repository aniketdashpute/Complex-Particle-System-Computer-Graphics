/*******************************************************************
* File: CForcer.js
* Author: Aniket Dashpute
* Credits:
* Most of the code is starter code
* by Prof. Jack Tumblin, Northwestern University
*******************************************************************/

const Forces = {
    // Non-existent force: ignore this CForcer object
    None: 0,
    // Spring-like connection to the mouse cursor
    // lets you 'grab' and 'wiggle' one or more particles
    Mouse: 1,
    // Earth-gravity: pulls all particles 'downward'
    EarthGravity: 2,
    // Planetary-gravity; particle-pair (e1,e2) attract each other
    PlanetaryGravity: 3,
    // Blowing-wind-like force-field
    Wind: 4,
    // Constant inward force towards a 3D centerpoint
    // if particle is > max_radius away from centerpoint
    Bubble: 5,
    // Viscous drag -- force = -K_drag * velocity
    Drag: 6,
    // ties together 2 particles; distance sets force
    Spring: 7,
    // a big collection of identical springs; lets you
    // make cloth & rubbery shapes as one force-making
    // object, instead of many many F_SPRING objects.
    Springset: 8,
    // attract/repel by charge and inverse distance
    Charge: 9,
    // 'max' is always the LAST name in our list
    MaxValue: 10,
}

function CForcer()
{
    // Constructor for a new 'forcer' applied-force object

    // initially no force at all.
    this.forceType = Forces.None;

    // particle-number (count from 0 in state variable)
    this.targFirst = 0;
    // of the first particle affected by this CForcer;

    // Number of sequential particles in state variable
    // affected by this CForcer object. To select ALL
    // particles from 'targFirst' on, set targCount < 0.
    // For springs, set targCount=0 & use e1,e2 below.
    this.targCount = -1;
                                                  
    // Earth Gravity variables:
    // gravity's acceleration(meter/sec^2);
    this.gravConst = 9.832;

    // 'down' direction vector for gravity
    // -ve Z direction is our 'down' vector
    this.downDir = new Vector4([0,0,-1,1]);

    // Planetary Gravity variables:
    // F = gravConst * mass1 * mass2 / dist^2.
    // Re-uses 'gravConst' from Earth gravity,
    // Minimum-possible separation distance for e1,e2;
    // avoids near-infinite forces when planets collide.
    this.planetDiam = 10.0;

    // Viscous Drag Variables:
    // force = -velocity*K_drag.
    // (in Euler solver, which assumes constant force
    // during each timestep, drag of 0.15 multiplies
    // s1 velocity by (1-0.15)==0.85)
    this.K_drag = 0.15;

    // Bubble-force variables:
    // bubble radius
    this.bub_radius = 1.0;
    // bubble's center point position
    this.bub_ctr = new Vector4(0,0,0,1);
    // inward-force's strength when outside the bubble
    this.bub_force = 1.0;

    // Single Spring variables:
    // Spring endpoints connect particle # e1 to # e2
    // (state vars hold particles 0,1,2,3,...partCount)
    this.e1 = 0;
    this.e2 = 1;
    // Spring constant: force = stretchDistance*K_s
    this.K_spring = 0.5;
    // Spring damping: (friction within the spring);
    // force = -relVel*K_damp; 'relative velocity' is
    // how fast the spring length is changing, and
    // applied along the direction of the spring.
    this.K_springDamp = 0.5;
    // the zero-force length of this spring.      
    this.K_restLength = 2.0;
}

CForcer.prototype.printMe = function(opt_src)
{
    // Print relevant contents of a given CForcer object.
    console.log("------------CForcer Contents:----------");  
        
    console.log("targFirst:", this.targFirst, "targCount:", this.targCount);
    var tmp = this.forceType;
    if(tmp < 0)
    {
        console.log("forceType ***NEGATED***; CForcer object temporarily disabled!");
        tmp = -tmp;     // reverse sign so we can display the force type:
    }
    switch(tmp)
    {
        case Forces.None:
            console.log("forceType: F_NONE");
            break;
        case Forces.Mouse:
            console.log("forceType: F_MOUSE");
            break;
        case Forces.EarthGravity: 
            console.log("forceType: F_GRAV_E. gravConst:", this.gravConst);
            this.downDir.printMe("downDir vector:");
            break;
        case Forces.PlanetaryGravity:
            console.log("forceType: F_GRAV_P. gravConst:", this.gravConst);
            console.log("e1, e2 particle numbers:", this.e1, ", ", this.e2,
                        "planetDiam (min e1,e2 distance):", this.planetDiam);
            break;
        case Forces.Wind:
            console.log("forceType: F_WIND.");
            break;
        case Forces.Bubble: 
            console.log("forceType: F_BUBBLE. bub_radius:", this.bub_radius,
                        "bub_force:", this.bub_force);
            this.bub_ctr.printMe("bub_ctr:");
            console
            break;
        case Forces.Drag:
            console.log("forceType: F_DRAG. K_drag:", this.K_drag);
            break;
        case Forces.Spring:
            console.log("forceType: F_SPRING.");
            console.log("e1, e2 particle numbers:", this.e1, ", ", this.e2);
            console.log("\tK_spring:", this.K_spring, 
                        "\tK_springDamp:", this.K_springDamp,
                        "\tK_restLength:", this.K_restLength);
            break;
        case Forces.Springset:
            console.log("forceType: F_SPRINGSET.");
            break;
        case Forces.Charge: 
            console.log("forceType: F_CHARGE.");
            break;
        default:
            console.log("forceType: invalid value:", this.forceType);
            break;
    }
    console.log("..........................................");
}