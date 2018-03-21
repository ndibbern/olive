
/*
 * Parser module
 *
 *   const parse = require('./parser');
 *
 *   parse(text)
 *       Returns the abstract syntax tree for the given program text. This
 *       function will first pre-parse (figure out indents and dedents),
 *       then match against an Ohm grammar, then apply AST generation
 *       rules. If there are any errors, this function will throw an error.
 */

const {
  Program,
  Block,
  ReturnStatement,
  WhileStatement,
  ForStatement,
  IfStatement,
  Type,
  IntegerLiteral,
  BooleanLiteral,
  StringLiteral,
  FloatLiteral,
  NoneLiteral,
  Binding,
  VariableExpression,
  BinaryExpression,
  UnaryExpression,
  Case,
  Matrix,
  Tuple,
  Set,
  Dictionary,
  KeyValuePair,
  // Immutables,
  StringInterpolation,
  Interpolation,
  Range
} = require('../ast');

const fs = require('fs');
const ohm = require('ohm-js');
const withIndentsAndDedents = require('./preparser');

const grammar = ohm.grammar(fs.readFileSync('./syntax/olive.ohm'));

// Ohm turns `x?` into either [x] or [], which we should clean up for our AST.
function unpack(a) {
  return a.length === 0 ? null : a[0];
}

/* eslint-disable no-unused-vars */
const semantics = grammar.createSemantics().addOperation('ast', {
  Program(b) { return new Program(b.ast()); },
  Block(s) { return new Block(s.ast()); },
  boollit(_) { return new BooleanLiteral(this.sourceString === 'true'); },
  intlit(_) { return new IntegerLiteral(this.sourceString); },
  floatlit(_1, _2, _3) { return new FloatLiteral(this.sourceString); },
  stringlit(_1, chars, _3) { return new StringLiteral(this.sourceString); },
  nonelit(_) { return new NoneLiteral(); },
  Statement_mutablebinding(v, _, e) { return new Binding(v.ast(), false, e.ast()); },
  Statement_immutablebinding(v, _, e) { return new Binding(v.ast(), true, e.ast()); },
  Statement_return(_, e) { return new ReturnStatement(unpack(e.ast())); },

  // Function_declaration(ann, id, _1, params, _2, _3, suite) {
  //   return new FunctionDeclaration(ann.ast(), id.ast(), params.ast(), suite.ast());
  // },
  // TypeAnnotation(id, _1, paramAnn, _2, returnAnn) {
  //   return new TypeAnnotation(id.ast());
  // },
  // Param() {},
  // Function_call(callee, _1, args, _2) { return new Call(callee.ast(), args.ast()); },
  // Arg() {},

  Statement_while(_, test, suite) { return new WhileStatement(test.ast(), suite.ast()); },
  Statement_for(_1, left, _2, right, suite) {
    return new ForStatement(left.ast(), right.ast(), suite.ast());
  },
  Statement_if(_1, firstTest, firstSuite, _2, moreTests, moreSuites, _3, lastSuite) {
    const tests = [firstTest.ast(), ...moreTests.ast()];
    const bodies = [firstSuite.ast(), ...moreSuites.ast()];
    const cases = tests.map((test, index) => new Case(test, bodies[index]));
    return new IfStatement(cases, unpack(lastSuite.ast()));
  },
  Suite(_1, block, _2) { return block.ast(); },
  Exp_or(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp_and(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp1_binary(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp2_binary(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp3_binary(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp4_binary(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp5_unary(op, operand) { return new UnaryExpression(op.ast(), operand.ast()); },
  Exp6_parens(_1, expression, _2) { return expression.ast(); },
  Tuple(_1, v, _2) { return new Tuple([...v.ast()]); },
  Matrix(_1, v, _2) { return new Matrix([...v.ast()]); },
  Set(_1, v, _2) { return new Set([...v.ast()]); },
  Range(open, start, _1, step, _2, end, close) {
    const openParen = open.primitiveValue;
    const closingParen = close.primitiveValue;
    return new Range(openParen, start.ast(), step.ast(), end.ast(), closingParen);
  },
  Dictionary(_1, v, _2) { return new Dictionary([...v.ast()]); },
  KeyValuePair(k, _, v) { return new KeyValuePair(k.ast(), v.ast()); },
  Types(typeName) { return Type.forName(typeName.sourceString); },
  StringInterpolation(_1, values, _2) { return new StringInterpolation([...values.ast()]); },
  Interpolation(_1, value, _2) { return new Interpolation(value.ast()); },
  VarExp(_) { return new VariableExpression(this.sourceString); },
  NonemptyListOf(first, _, rest) { return [first.ast(), ...rest.ast()]; },
  ListOf(args) { return [...args.ast()]; },
  EmptyListOf() { return []; },
  id(_1, _2) { return this.sourceString; },
  _terminal() { return this.sourceString; },
});
/* eslint-enable no-unused-vars */

module.exports = (text) => {
  const match = grammar.match(withIndentsAndDedents(text));
  if (!match.succeeded()) {
    throw new Error(`Syntax Error: ${match.message}`);
  }
  return semantics(match).ast();
};
