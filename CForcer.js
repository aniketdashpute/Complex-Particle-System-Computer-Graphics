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
    // tornado force:
    Tornado: 10,
    // Flocking Behaviour for boids:
    Flocking: 11,
    // 'max' is always the LAST name in our list
    MaxValue: 12,
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

    // tornado center position
    this.TornadoCenter = new Vector4([0,0,1,0]);

    this.tornadoRadius = 5.0;
    this.tornadoHeight = 20.0;
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

CForcer.prototype.applyBoidForces = function(s, flockNeighbourhood, mStart, mEnd, scaling, objPos)
{
    // var flockNeighbourhood = {
    //     Cohesive: flockNbCohesive,
    //     Repulsive: flockNbRepulsive,
    //     Velocity: flockNbVelocity,
    //     Obstacle: flockNbObstacle,
    // }

    var scaling1 = scaling.Cohesive;
    var scaling2 = scaling.Repulsive;
    var scaling3 = scaling.Velocity;
    var scaling4 = scaling.Obstacle;

    var fNb1 = flockNeighbourhood.Cohesive;
    var fNb2 = flockNeighbourhood.Repulsive;
    var fNb3 = flockNeighbourhood.Velocity;
    var fNb4 = flockNeighbourhood.Obstacle;

    var j = mStart*Properties.maxVariables;  // state var array index for particle # m
    for(var m = mStart; m<mEnd; m++, j+=Properties.maxVariables)
    {
        // rule 1: steer towards centre of mass
        //console.log("current mJ: " + m);
        var del_F1 = this.ruleSteerTowards(s, fNb1, m, mStart, mEnd, scaling1);

        // rule 2: steer away from neighbouring particles
        var del_F2 = this.ruleSteerAway(s, fNb2, m, mStart, mEnd, scaling2);

        // rule 3: make velocity closer to average neighbourhood velocity
        var del_F3 = this.matchVelocity(s, fNb3, m, mStart, mEnd, scaling3);

        // rule 4: move particles away from obstacle
        //var del_F3 = this.ruleSteerAwayObject(s, fNb4, m, mStart, mEnd, scaling4, objPos);

        // apply the forces as a net flocking force
        var del_F_x = del_F1.x + del_F2.x + del_F3.x;
        var del_F_y = del_F1.y + del_F2.y + del_F3.y;
        var del_F_z = del_F1.z + del_F2.z + del_F3.z;

        s[j + Properties.force.x] += del_F_x;
        s[j + Properties.force.y] += del_F_y;
        s[j + Properties.force.z] += del_F_z;
    }
}

CForcer.prototype.ruleSteerTowards = function(s, flockNeighbourhood, mJ, mStart, mEnd, scaling)
{
    // inside the neighbourhood:
    // calculate the centroid
    var cen_x = 0;
    var cen_y = 0;
    var cen_z = 0;

    var j = mStart*Properties.maxVariables;
    var i1 = mJ*Properties.maxVariables;
    var curr_x = s[i1 + Properties.position.x];
    var curr_y = s[i1 + Properties.position.y];
    var curr_z = s[i1 + Properties.position.z];

    var nbCount = 0;

    for(m = mStart; m<mEnd; m++, j+=Properties.maxVariables)
    {
        
        var i2 = m*Properties.maxVariables;

        var diff_x = Math.pow(curr_x - s[i2 + Properties.position.x], 2);
        var diff_y = Math.pow(curr_y - s[i2 + Properties.position.y], 2);
        var diff_z = Math.pow(curr_z - s[i2 + Properties.position.z], 2);
        var fNb = Math.pow(flockNeighbourhood, 2);

        if ((diff_x + diff_y + diff_z) <= fNb)
        {
            if (m != mJ)
            {
                cen_x = cen_x + s[i2 + Properties.position.x];
                cen_y = cen_y + s[i2 + Properties.position.y];
                cen_z = cen_z + s[i2 + Properties.position.z];

                nbCount = nbCount + 1;
            }
        }
    }
    
    cen_x = cen_x / nbCount;
    cen_y = cen_y / nbCount;
    cen_z = cen_z / nbCount;


    // calculate distance of our particle from centroid
    var Fx = (cen_x - curr_x) * scaling;
    var Fy = (cen_y - curr_y) * scaling;
    var Fz = (cen_z - curr_z) * scaling;

    return {
        x: Fx,
        y: Fy,
        z: Fz,
    }
}

CForcer.prototype.ruleSteerAway = function(s, flockNeighbourhood, mJ, mStart, mEnd, scaling)
{
    // inside the neighbourhood:
    // calculate the centroid
    var cen_x = 0;
    var cen_y = 0;
    var cen_z = 0;

    var j = mStart*Properties.maxVariables;
    var i1 = mJ*Properties.maxVariables;
    var curr_x = s[i1 + Properties.position.x];
    var curr_y = s[i1 + Properties.position.y];
    var curr_z = s[i1 + Properties.position.z];

    var nbCount = 0;

    for(m = mStart; m<mEnd; m++, j+=Properties.maxVariables)
    {
        
        var i2 = m*Properties.maxVariables;

        var diff_x = Math.pow(curr_x - s[i2 + Properties.position.x], 2);
        var diff_y = Math.pow(curr_y - s[i2 + Properties.position.y], 2);
        var diff_z = Math.pow(curr_z - s[i2 + Properties.position.z], 2);
        var fNb = Math.pow(flockNeighbourhood, 2);

        if ((diff_x + diff_y + diff_z) <= fNb)
        {
            if (m != mJ)
            {
                cen_x = cen_x + s[i2 + Properties.position.x];
                cen_y = cen_y + s[i2 + Properties.position.y];
                cen_z = cen_z + s[i2 + Properties.position.z];

                nbCount = nbCount + 1;
            }
        }
    }
    
    cen_x = cen_x / nbCount;
    cen_y = cen_y / nbCount;
    cen_z = cen_z / nbCount;


    // calculate distance of our particle from centroid
    // apply that displacement in the opposite direction
    var Fx = -(cen_x - curr_x) * scaling;
    var Fy = -(cen_y - curr_y) * scaling;
    var Fz = -(cen_z - curr_z) * scaling;

    return{
        x: Fx,
        y: Fy,
        z: Fz,
    }
}

CForcer.prototype.matchVelocity = function(s, flockNeighbourhood, mJ, mStart, mEnd, scaling)
{
    // inside the neighbourhood:
    // calculate the average velocity of the flock in neighbourhood
   // inside the neighbourhood:
    // calculate the centroid
    var vAvg_x = 0;
    var vAvg_y = 0;
    var vAvg_z = 0;

    var j = mStart*Properties.maxVariables;
    var i1 = mJ*Properties.maxVariables;

    var vCurr_x = s[i1 + Properties.velocity.x];
    var vCurr_y = s[i1 + Properties.velocity.y];
    var vCurr_z = s[i1 + Properties.velocity.z];

    var curr_x = s[i1 + Properties.position.x];
    var curr_y = s[i1 + Properties.position.y];
    var curr_z = s[i1 + Properties.position.z];

    var nbCount = 0;

    for(m = mStart; m<mEnd; m++, j+=Properties.maxVariables)
    {
        
        var i2 = m*Properties.maxVariables;

        var diff_x = Math.pow(curr_x - s[i2 + Properties.position.x], 2);
        var diff_y = Math.pow(curr_y - s[i2 + Properties.position.y], 2);
        var diff_z = Math.pow(curr_z - s[i2 + Properties.position.z], 2);
        var fNb = Math.pow(flockNeighbourhood, 2);

        if ((diff_x + diff_y + diff_z) <= fNb)
        {
            if (m != mJ)
            {
                vAvg_x = vAvg_x + s[i2 + Properties.velocity.x];
                vAvg_y = vAvg_y + s[i2 + Properties.velocity.y];
                vAvg_z = vAvg_z + s[i2 + Properties.velocity.z];

                nbCount = nbCount + 1;
            }
        }
    }
    
    vAvg_x = vAvg_x / nbCount;
    vAvg_y = vAvg_y / nbCount;
    vAvg_z = vAvg_z / nbCount;


    // calculate distance of our particle from centroid
    // apply that displacement in the opposite direction
    var Fx = (vAvg_x - vCurr_x)/scaling;
    var Fy = (vAvg_y - vCurr_y)/scaling;
    var Fz = (vAvg_z - vCurr_z)/scaling;

    return{
        x: Fx,
        y: Fy,
        z: Fz,
    }
    // make our velocity closer to this velocity
    // we can do that by accelerating in the direction of the velocity

}

CForcer.prototype.ruleSteerAwayObject = function(s, flockNeighbourhood, mJ, mStart, mEnd, scaling, objPosition)
{
    // inside the neighbourhood:
    // calculate the centroid
    var cen_x = objPosition.x;
    var cen_y = objPosition.y;
    var cen_z = objPosition.z;

    var i1 = mJ*Properties.maxVariables;
    var curr_x = s[i1 + Properties.position.x];
    var curr_y = s[i1 + Properties.position.y];
    var curr_z = s[i1 + Properties.position.z];

    // calculate distance of our particle from object
    // apply that displacement in the opposite direction
    var Fx = -(cen_x - curr_x) * scaling;
    var Fy = -(cen_y - curr_y) * scaling;
    var Fz = -(cen_z - curr_z) * scaling;

    return{
        x: Fx,
        y: Fy,
        z: Fz,
    }
}