
class Shape{

}

class Point extends Shape{
  constructor(x, y){
    this.x = x;
    this.y = y;
  }

  toJson(){
    return {x: this.x, y: this.y}
  }
}

class Line extends Shape{
  constructor(startX, startY, endX, endY) {
    this.x1 = startX;
    this.y1 = startY;
    this.x2 = endX;
    this.y2 = endY;
  }

  static newLinefromPoints(leftPoint, rightPoit){
    this.x1 = leftPoint.x;
    this.y1 = leftPoint.y;

    this.x2 = rightPoit.x;
    this.y1 = rightPoit.y;
  }

  toJson(){
    return {x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2};
  }

  slope(){
    if (this.x1 == this.x2) return false;
    return (this.y2 - this.y1) / (this.x2 - this.x1);
  }

  is1D(){
    return this.x1 == this.x2 && this.y1 == this.y2;
  }


  yInt() {  // y-intercept
    // parallel to the y-axis
    // case 1) Pass the origin   case 2) Never passes y-axis
    if (this.x1 === this.x2) return this.y1 === 0 ? 0 : false;

    // parallel to the x-axis
    if (this.y1 === this.y2) return this.y1;

    return this.y1 - this.slope() * x1 ;
  };

  xDiff() {
    return this.x2 - this.x1;
  }

  yDiff(){
    return this.y2 - this.y1;
  }


}

class Rect extends Shape{
  constructor(startX, startY, endX, endY) {
    this.x1 = startX;
    this.y1 = startY;
    this.x2 = endX;
    this.y2 = endY;
  }

  static newLineBypoints(leftTop, rightBottom){
    this.x1 = leftTop.x;
    this.y1 = leftTop.y;
    this.x2 = rightBottom.x;
    this.y2 = rightBottom.y;
  }

  toJson(){
    return {x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2};
  }

  getTopLine() {
    return new Line(this.x1, this.y1, this.x1, this.y1);
  }

  getLeftLine(){
    return new Line(this.x1, this.y1, this.x1, this.y2);
  }

  getRightLine(){
    return new Line(this.x2, this.y1, this.x1, this.y2);
  }

  getBottomLine() {
    return new Line(this.x1, this.y2, this.x2, this.y2);
  }
}


class Collision{
  // https://stackoverflow.com/a/60368757/6652082
  static isLineLineCollision(line1, line2){

    if(line1.is1D() || line2.is1D())
      return false;
    const slope = line1.slope() - line2.slope();
    // Lines are parallel
    if (slope === 0) return false;

    const dis_y1 = line1.y1 - line2.y1;
    const dis_x1 = line1.x1 - line2.x1;
    let ua = (line2.xDiff() * dis_y1 - line2.yDiff() * dis_x1) / slope
    let ub = (line1.xDiff() * dis_y1 - line1.yDiff() * dis_x1) / slope
     // is the intersection along the segments
     if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      return false
    }
    return true;

  }

  static isLineRectCollision(line1, rect2){
    const top = rect2.getTopLine();
    const right = rect2.getRightLine();
    const bottom = rect2.getBottomLine();
    const left = rect2.getLeftLine();

    return isLineLineCollision(line1, top) || isLineLineCollision(line1, right) || 
      isLineLineCollision(line1, bottom) || isLineLineCollision(line1, left);
  }
}

export { Line, Rect, Collision}
