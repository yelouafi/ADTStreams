/* global describe it */

import { Stream } from "../src"
import { assertP } from "./assertPS"
import { Scheduler } from "./scheduler"


var sch = new Scheduler();
sch.mock();

function assertS(s, exp, log = false, force = false) {
  if(!sch.running || force) 
    sch.run(log);
  return Promise.all([assertP.deepEqual(sch.captureSeq(s), exp), sch.running]);
  return sch.running;
}

function schedule(assertion) {
  assertion();
  return sch.run();
}


describe('Scheduler', () => {
  
  beforeEach( () => sch.reset() )
  
  describe('#seq()', () => {
    it('should yields a sequence', () => {
      return assertS( Stream.seq([1,2,3], 2, 5), [ [1,2], [2,2+5],[3, 2+5+5] ] )
    })
  })
  
  describe('#range()', () => {
    it('should yields a range', () =>
      assertS( Stream.range(1,3 , 2, 5), [ [1,2], [2,2+5],[3, 2+5+5] ] )
    )
  })
  
  describe('#occs()', () => {
    it('should yields occurrences', () =>
      assertS( Stream.occs( [[1,0], [2,5], [3,17]] ),  [[1,0], [2,5], [3,17]] )
    )
  })
  
})


describe('Stream', () => {
  
  
  beforeEach( () => sch.reset() )
  
  describe('#map()', () => {
    it('should map a sequence with a function', () => {
      var seq2 = Stream.seq([1,2,3], 2, 5).map( x => x + 10 )
      return assertS( seq2, [ [11,2] ,[12,2+5], [13,2+5+5] ] )
    })
    
    it('should maps a with an async function', () => {
      var idx = 0,
          seq2 = Stream.seq([1,2,3], 2, 5).map( x => sch.getLater( () => x + 10, 5*idx++ ) )
      return assertS( seq2, [ [11, 2+5*0] ,[12, (2+5)+5*1], [13, (2+5+5)+5*2] ] )
    })
  })
  
  
  describe('#mapError()', () => {
    it('should extends an aborted sequence with another sequence', () => {
      var seq2 = Stream.occs( [ [1,20],[2,70], ['error', 150] ] ).mapError( (_ => Stream.occs( [[3, 170]]) ) )
      return assertS( seq2, [ [1,20], [2,70], [3,170] ] )
    })
  })
  
  
  describe('#length()', () => {
    it('should return the length of a sequence', () =>
      schedule( () => assertP.equal( Stream.seq([1,2,3], 0, 50).length(), 3 ) )
    )
  })
  
  /
  describe('#first()', () => {
    it('should return the first occurrence from a sequence', () =>
      schedule( () => assertP.equal( Stream.seq([1,2,3], 20, 50).first(), 1 ) )
    )
    
    it('should reject the promise of first element if the stream is Empty', () =>
      schedule( () => assertP.rejected( Stream.seq([], 20, 50).first() ) )
    )
  })
  
  describe('#last()', () => {
    it('should return the last occurrence (3) from a sequence ([1,2,3],...)', () =>
      schedule( () => assertP.equal( Stream.seq([1,2,3], 20, 50).last(), 3 ) )
    )
    
    it('should reject the promise of last element if the stream is Empty', () =>
      schedule( () => assertP.rejected( Stream.seq([], 20, 50).last() ) )
    )
  })
  
  describe('#at()', () => {
    it('should return the 2nd occurrence (2) from a sequence ([1,2,3],...)', () =>
      schedule( () => assertP.equal( Stream.seq([1,2,3], 20, 50).at(1), 2 ) )
    )
    
    it('should reject the promise of 4th occurrence from a sequence ([1,2,3],...)', () =>
      schedule( () => assertP.rejected( Stream.seq([1,2,3], 20, 50).at(3) ) )
    )
  })
  
  
  describe('#take()', () => {
    it('should take n first occurrences from a sequence', () =>
      assertS( Stream.seq([1,2,3,4,5,6], 20, 50).take(2), [[1,20],[2,70]] )
    )
  })
  
  describe('#takeWhile()', () => {
    it('should take from a sequences until the predicate stops been satisfied', () =>
      assertS( Stream.seq([1,2,3,4,5,6], 20, 50).takeWhile(x => x < 4), [[1,20],[2,70],[3,120]] )
    )
  })
  
  describe('#takeUntil()', () => {
    it('should take from a sequence until a promise complete', () =>
      assertS( 
        Stream.seq([1,2,3,4,5,6], 20, 50).takeUntil(sch.getLater( () => 1, 190)), 
        [[1,20],[2,70],[3,120], [4,170]]
      )
    )
  })
  
  describe('#skip()', () => {
    it('should skip first n occurrences of a sequence', () =>
      assertS( Stream.seq([1,2,3,4,5,6], 20, 50).skip(4), [[5,220],[6,270]] )
    )
  })
  
  describe('#skipWhile()', () => {
    it('should skip occurrences of a sequence until the predicate stops been satisfied', () =>
      assertS( Stream.seq([1,2,3,4,5,6], 20, 50).skipWhile(x => x < 5), [[5,220],[6,270]] )
    )
  })
  
  describe('#skipUntil()', () => {
    it('should skip occurrences of a sequence until a promise completes', () =>
      assertS( 
        Stream.seq([1,2,3,4,5,6], 20, 50).skipUntil(sch.getLater( () => 1, 190)), 
        [[5,220],[6,270]]
      )
    )
  })
  
  describe('#filter()', () => {
    it('should filter occurrences of a sequence', () =>
      assertS( 
        Stream.seq([1,2,3,4,5,6], 20, 50).filter( x => !(x%2) ), 
        [[2,70],[4,170],[6,270]]
      )
    )
  })
  
  describe('#span()', () => {
    it('should spans a sequence into [takeWhile(predicate), skipWhile(predicate)]', () => {
      var ss = Stream.seq([1,2,3,4,5,6], 20, 50).span( x => x < 3 )
      sch.run();
      return Promise.all([
        assertS( ss[0], [[1,20],[2,70]] ),
        assertS( ss[1], [[3,120],[4,170],[5,220],[6,270]] )
      ])
    })
  })
  
  describe('#group()', () => {
    it('should group a sequence into subsequences by a predicate', () => {
      var ss = Stream.seq([1,1,3,3,5,5], 20, 50).group()
      sch.run();
      return Promise.all([
        assertS( Stream.Future(ss.at(0)), [[1,20],[1,70]], true),
        assertS( Stream.Future(ss.at(1)), [[3,120],[3,170]], true),
        assertS( Stream.Future(ss.at(2)), [[5,220],[5,270]], true)  
      ])
    })
  })
  
  describe('#splitBy()', () => {
    it('should split each occurrence into one or more occurrences of a sequence', () => {
      var ss = Stream.seq(["one;tow;", "three;four"], 20, 50).splitBy( s => Stream.array( s.split(";").filter( s => s !== "") ) )
      return assertS( ss, [["one",20], ["tow",20], ["three",70], ["four",70]])
    })
  })
  
  describe('#chunkBy()', () => {
    it('should yields chunks by combining occurrences from a sequence', () => {
      var ss = Stream.seq(["on", "e\ntow\nthr", "ee\nfo", "ur"], 20, 50)
                .chunkBy( '', (prec, s) => {
                  var lines = s.split('\n'), head = lines[0], last = lines.length - 1;
                  return (last > 0) ?
                    [ Stream.array([].concat(prec + head, lines.slice(1, last))), Promise.resolve(lines[last]) ] :
                    [ Stream.Empty, Promise.resolve(prec + head) ];
                })
      return assertS( ss, [["one",70], ["tow",70], ["three",120], ["four",220]])
    })
  })
  
  describe('#scan()', () => {
    it('should yield accumulated results of a sequence', () =>
      assertS( Stream.seq([1,2,3], 20, 50).scan( (p,c) => p+c, 0 ), [[1,20],[3,70], [6,120]] )
    )
    
    it('should yield accumulated results of a sequence using first occurrence as seed', () =>
      assertS( Stream.seq([1,2,3], 20, 50).scan( (p,c) => p+c ), [[1,20],[3,70], [6,120]] )
    )
  })
  
  describe('#window()', () => {
    it('should yield a sliding window of results from a sequence', () =>
      assertS( Stream.range(1, 5, 0, 20).window(3,3) , [[[1,2,3],40],[[2,3,4],60], [[3,4,5],80]] )
    )
  })

  describe('#toArray()', () => {
    it('should convert a sequence to an array', () =>
      schedule( () => assertP.deepEqual( Stream.seq([1,2,3], 0, 50).toArray(), [1,2,3] ) )
    )
  })
  
  describe('#all()', () => {
    it('should check if all occurrences satisfy a predicate', () =>
      schedule( () => assertP.equal( Stream.seq([1,3,7,21], 0, 50).all( x => !!(x % 2) ), true ) )
    )
  })
  
  describe('#any()', () => {
    it('should check if any occurrence satisfy a predicate', () =>
      schedule( () => assertP.equal( Stream.seq([1,3,7,21], 0, 50).all( x => !(x % 2) ), false ) )
    )
  })

  describe('#concat()', () => {
    it('should concat to sequences into consecutive occurrences', () =>
      assertS( 
        Stream.seq([1,2], 20, 50).concat( Stream.seq([3,4,5], 120,20) ), 
        [[1,20],[2,70],[3,120],[4,140],[5,160]] )
    )
  })
  
  describe('#combine()', () => {
    it('should combine latest occurrences from 2 sequences', () =>
      assertS( 
        Stream.seq([1,2,3,4], 10, 10).combine( Stream.seq([10,20,30], 22,20), (x,y) => x+y ), 
        [[12,22],[13,30],[14,40],[24,42],[34,62]])
    )
    
    it('should combine latest occurrences from many sequences', () =>
      assertS( 
        Stream.combine([
          Stream.seq([1,2,3,4], 10, 10),
          Stream.seq([10,20,30], 22,20),
          Stream.seq([100,200,300], 34,30)
        ]), 
        [ [[3,10,100],34],[[4,10,100],40],[[4,20,100],42],[[4,30,100],62],[[4,30,200],64],[[4,30,300],94] ])
    )
    
  })
  
  describe('#merge()', () => {
    it('should merge occurrences from 2 sequences', () =>
      assertS( 
        Stream.seq([1,3,5], 0, 50).merge( Stream.seq([2,4], 25,50) ), 
        [[1,0],[2,25],[3,50],[4,75],[5,100]])
    )
  })
  
  describe('#relay()', () => {
    it('should yield occurrences from a sequence until another sequence begins yielding', () =>
      assertS( 
        Stream.seq([1,2,5], 0, 20).relay( Stream.seq([3,4], 25,50) ), 
        [[1,0],[2,20],[3,25],[4,75]])
    )
  })

  describe('#zip()', () => {
    it('should pairwise occurrences from 2 sequences', () =>
      assertS( 
        Stream.seq([1,2,3], 0, 50).zip( Stream.seq(['a', 'b'], 25, 50) ), 
        [ [[1,'a'],25], [[2,'b'],75] ] )
    )
    
    it('should wait occurrences from 2 streams to pairwise', () =>
      assertS( 
        Stream.Cons(1, Stream.Cons(2, Stream.Empty)).zip( Stream.seq(['a', 'b'], 25, 50) ), 
        [ [[1,'a'],25], [[2,'b'],75] ] )
    )
  })
  
  describe('#mergeMap()', () => {
    it('should map occurrences to subsequences and merge the results', () =>
      assertS( 
        Stream.seq([1,2,3], 0, 5).mergeMap( n => Stream.range(1, n, 100, 20) ), 
        [[1,100],[1,105],[1,110],[2,125],[2,130],[3,150]] )
    )
  })
  
  describe('concatMap()', () => {
    it('should map occurrences to subsequences and concat the results', () =>
      assertS( 
        Stream.seq([1,2,3], 0, 5).concatMap( n => Stream.range(1, n, 100, 20) ), 
        [[1,100],[1,120],[2,125],[1,145], [2,145],[3,150]] )
    )
  })
  
  describe('#relayMap()', () => {
    it('should map occurrences to subsequences and relay the results', () =>
      assertS( 
        Stream.seq([1,2,3], 0, 5).relayMap( n => Stream.range(1, n, 100, 20) ), 
        [[1,100],[1,105],[1,110],[2,130],[3,150]] )
    )
  })
  
  
  
  describe('#debounce()', () => {
    it('should debounce occurrences by a time delay', () => {
      var seq =  sch.occs([ [1,0],[2,20],[3,150],[4,200],[5,700],[6,750], ['end', 1000] ]).debounce( () => sch.getLater(() => 1, 100) )
      return assertS(seq,  [ [2,120],[4,300], [6,850] ])
    })
    
    it('should debounce the last occurrence immediately after the stream ends', () => {
      var seq =  sch.occs([ [1,0],[2,20],[3,150],[4,200],[5,700],[6,750], ['end', 800] ]).debounce( () => sch.getLater(() => 1, 100) )
      return assertS(seq,  [ [2,120],[4,300], [6,800] ])
    })
  })
  
  describe('#throttle()', () => {
    it('should throttle occurrences by a time delay', () => {
      var seq =  sch.occs([ [1,0],[2,20],[3,150],[4,200],[5,700],[6,750], ['end', 1000] ]).throttle( () => sch.getLater(() => 1, 100) )
      return assertS(seq,  [ [1,0],[3,150], [5,700] ])
    })
  })
  
})