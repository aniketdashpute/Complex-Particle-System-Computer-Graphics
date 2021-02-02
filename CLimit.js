// Each 'CLimit' object contains a 'hitType' member variable whose value
// selects how particle(s) will respond to collisions with a constraint:

const HitType = {
    // re-set position to meet constraint, re-set velocity to zero
    Stop: 0,
    // remove all velocity in the surface-normal direction
    Slide: 1,
    // simple velocity reversal method
    BounceVelocityReversal: 2,
    // impulsive method that enables 'bouncy' particle
    // to come to rest on a floor
    BounceImpulsive: 3,
}

// Each 'CLimit' object contains a 'limitType' member variable whose value
// selects the kind of constraint that the object describes from these:

const LimitType = {
    // non-existent, disabled, or unused constraint object
    None: 0,
    // Keeps particles inside/outside the axis-aligned rectangular volume
    Volume: 1,
    // Keeps particles inside/outside the ellipsoid volume
    // that osculates ('kisses the walls') the axis-aligned volume
    Ball: 2,
    // Prevents particles from passing through a 2-sided
    // axis-aligned wall that is rectangular, flat/2D, zero thickness
    Wall: 3,
    // Prevents particles from passing through a 2-sided
    // axis-aligned ellipsoidal wall that is flat/2D, zero thickness
    Disc: 4,
    // Creates an axis-aligned rectangular 'box' made of zero-thickness
    // 'walls' that prevent particles from  passing though from either side
    Box: 5,
    // Matrix-transformed Limit Volume:
    // Orthonormal Matrix4 member 'poseMatrix' (translate, rotate only)
    // transforms 'world' drawing axes to our own 'pose' drawing axes
    MatrixVolume: 6,
    // Matrix-transformed Limit Ball:
    MatrixBall: 7,
    // Matrix-transformed Limit Wall, (recommend zMin=zMax=0)
    MatrixWall: 8,
    // Matrix-transformed LIM_DISC:(recommend zMin=zMax=0)
    MatrixDisc: 9,
    /**
    * CyinderVolume: 10,
    * CylinderSide: 11,
    * MatrixCylinderVolume: 12,
    * MatrixCylinderSide: 13,
    */
    // Distance constraints:
    Distance:
    {
        // Keep specified particle(s) at world-space location
        Anchor: 10,
        // Limit specified particles(s) positions to stay
        // within xMin,xMax,yMin,yMax,yMin,zMax (for example,
        // xMin=0, xMax=1, yMin=yMax=5; zMin=zMax=3; would
        // allow particle to 'slide' along line segment in x.
        Slot: 11,
        // Connects 2 particles with fixed-length separation
        // between particles whose indices are held in e1,e2
        // (e.g. particles at pS0[e1] and pS0[e2] )
        Rod: 12,
        // Prevent 2 particles selected by members e1,e2 fro
        // separating by more than distance 'radMax';
        Rope: 13,
        // Prevent any particle in a set (targFirst,targCount)
        // from getting closer than 2*this.radius to any other
        // particle in that set, as if both particles were
        // hard solid spheres that can't pass thru each other.
        Radius: 14,
        // Keep constant sum-of-distances for 3 particles
        // A,B,Pivot:  ||A-Pivot||+||B-Pivot|| = dmax.
        Pulley: 15,
        // Max number of possible limitType values available
        maxVariables: 16,
   }   
}

function CLimit()
{
    // Constructor for a new 'limit' object -- a constraint-applying object.
    // initially no constraint at all.
    this.limitType = LimitType.None;
    // but set for impulsive collision/bounce
    this.hitType = HitType.BounceImpulsive;
    // if true, draw this constraint on-screen
    this.isVisible = true;
  
    // Coeff. of restoration for constraint surfaces:
    this.K_resti = 1.0;
  
    // Specify which particles are constrained by this CLimit object:
    // particle-number (count from 0 in state variable)
    // of the first particle constrained by this CLimit
    this.targFirst =  0;

    // Number of sequential particles in state variable
    // constrained by this CLimit object. To select ALL
    // particles from 'targFirst' on, set targCount < 0.
    // For pairs of particles chosen by e1,e2 below,
    // set targCount=0.                        
    this.targCount = -1;      
                            
    // particle-number (count from 0 in state variable)
    // of the 2 particles constrained by this CLimit.
    this.e1 = 0; this.e2 = 1;

    // define axis-aligned volume or box
    this.xMin = 0.0;   this.xMax = 0.0;
    this.yMin = 0.0;   this.yMax = 0.0;
    this.zMin = 0.0;   this.zMax = 0.0;

    // Orthonormal matrix (translate,rotate ONLY: NO SCALING!)
    // that transforms world drawing axes to 'pose' axes where 
    // we define 'wall' and other non-axis-aligned constraints.
    this.poseMatrix = new Matrix4();

    // hard/solid particle size imposed by by LimitType Radius
    this.radius = 1.0;
}

CLimit.prototype.printMe = function(opt_src)
{
    // Print relevant contents of a given CLimit object.
    console.log("------------CLimit Contents:----------");
        
    console.log("targFirst:", this.targFirst, "targCount:", this.targCount);

    switch(this.hitType)
    {
        case HitType.Stop:
            console.log("hitType: Stop");
            break;
        case HitType.Slide:
            console.log("hitType: Slide");
            break;
        case HitType.BounceVelocityReversal:
            console.log("hitType: BounceVelocityReversal");
            break;
        case HitType.BounceImpulsive:
            console.log("hitType: BounceImpulsive");
            break;
        default:
            console.log("***INVALID*** hitType value:", this.hitType);
            break;
    }
    
    
    var tmp =this.limitType;   
    if(tmp < 0)
    {
        console.log("limitType ***NEGATED***; CLimit object temporarily disabled!");
        tmp = -tmp;   // reverse sign so the switch statement will work.
    }
    
    switch(this.limitType)
    {
        case LimitType.None:
            console.log("limitType: None");
            break;
        case LimitType.Volume:
            console.log("limitType: Volume");
            console.log("(xMin,xMax):", this.xMin,", ", this.xMax,
                        "(yMin,yMax):", this.yMin,", ", this.yMax,
                        "(zMin,zMax):", this.zMin,", ", this.zMax);
            break;
        case LimitType.Ball:
            console.log("limitType: Ball");
            break;
        case LimitType.Wall:
            console.log("limitType: Wall");
            break;
        case LimitType.Disc:
            console.log("limitType: Disc");
            break;
        case LimitType.Box:
            console.log("limitType: Box");
            break;
        case LimitType.MatrixVolume:
            console.log("limitType: MatrixVolume");
            break;
        case LimitType.MatrixBall:
            console.log("limitType: MatrixBall");
            break;
        case LimitType.MatrixWall:
            console.log("limitType: MatrixWall");
            break;
        case LimitType.MatrixDisc:
            console.log("limitType: MatrixDisc");
            break;
        case LimitType.Distance.Anchor:
            console.log("limitType: Distance.Anchor");
            break;
        case LimitType.Distance.Slot:
            console.log("limitType: Distance.Slot");
            break;
        case LimitType.Distance.Rod:
            console.log("limitType: Distance.Rod");
            break;
        case LimitType.Distance.Rope:
            console.log("limitType: Distance.Rope");
            break;
        case LimitType.Distance.Radius:
            console.log("limitType: Distance.Radius");
            break;
        case LimitType.Distance.Pulley:
            console.log("limitType: Distance.Pulley");
            break;
        default:
            console.log("limitType: invalid value:", this.limitType);
            break;
    }
    console.log("..........................................");
}