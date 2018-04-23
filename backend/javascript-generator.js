/*
 * Translation to JavaScript
 *
 * Requiring this module adds a gen() method to each of the AST classes.
 * Nothing is actually exported from this module.
 *
 * Generally, calling e.gen() where e is an expression node will return the
 * JavaScript translation as a string, while calling s.gen() where s is a
 * statement-level node will write its translation to standard output.
 *
 *   require('./backend/javascript-generator');
 *   program.gen();
 */

const { InitialContext } = require('../analyzer');

const {
  Program,
  Block,
  ReturnStatement,
  WhileStatement,
  ForStatement,
  IfStatement,
  ExpressionStatement,
  Type,
  NumberLiteral,
  BooleanLiteral,
  StringLiteral,
  NoneLiteral,
  MutableBinding,
  ImmutableBinding,
  IdExpression,
  SubscriptExpression,
  BinaryExpression,
  UnaryExpression,
  Case,
  MatrixExpression,
  TupleExpression,
  SetExpression,
  DictionaryExpression,
  KeyValuePair,
  StringInterpolation,
  Interpolation,
  RangeExpression,
  FunctionCallExpression,
  FunctionDeclarationStatement,
  FunctionTypeAnnotation,
  MatrixType,
  TupleType,
  SetType,
  DictionaryType,
  Variable,
  FunctionVariable,
} = require('../ast');
/*
 * Translation to JavaScript
 *
 * Requiring this module adds a gen() method to each of the AST classes.
 * Nothing is actually exported from this module.
 *
 * Generally, calling e.gen() where e is an expression node will return the
 * JavaScript translation as a string, while calling s.gen() where s is a
 * statement-level node will write its translation to standard output.
 *
 *   require('./backend/javascript-generator');
 *   program.gen();
 */

// TODO: this is copied code.
// should be imported from AST or wherever we choose to define built in functions
const addBuiltInFunctionsToContext = (context) => {
  const printFunctionAnnotation = new FunctionTypeAnnotation('print', [Type.STRING], Type.STRING);
  const printFunctionStatement = new FunctionDeclarationStatement(printFunctionAnnotation, 'print', ['_'], null);
  printFunctionStatement.analyze(context);

  const sqrtFunctionAnnotation = new FunctionTypeAnnotation('sqrt', [Type.NUMBER], Type.NUMBER);
  const sqrtFunctionStatement = new FunctionDeclarationStatement(sqrtFunctionAnnotation, 'sqrt', ['_'], null);
  sqrtFunctionStatement.analyze(context);
};

addBuiltInFunctionsToContext(InitialContext);


const indentPadding = 2;
let indentLevel = 0;

function emit(line) {
  console.log(`${' '.repeat(indentPadding * indentLevel)}${line}`);
}

function genStatementList(statements) {
  indentLevel += 1;
  statements.forEach(statement => statement.gen());
  indentLevel -= 1;
}

function makeOp(op) {
  return {
    not: '!',
    and: '&&',
    or: '||',
    '==': '===',
    '!=': '!==',
    '>=': '>==',
    '<=': '<==',
  }[op] || op;
}

// jsName(e) takes any PlainScript object with an id property, such as a
// Variable, Parameter, or FunctionDeclaration, and produces a JavaScript
// name by appending a unique indentifying suffix, such as '_1' or '_503'.
// It uses a cache so it can return the same exact string each time it is
// called with a particular entity.
const jsName = (() => {
  let lastId = 0;
  const map = new Map();
  return (v) => {
    if (!(map.has(v))) {
      map.set(v, ++lastId); // eslint-disable-line no-plusplus
    }
    return `${v.id}_${map.get(v)}`;
  };
})();

// This is a nice helper for variable declarations and assignment statements.
// The AST represents both of these with lists of sources and lists of targets,
// but when writing out JavaScript it seems silly to write `[x] = [y]` when
// `x = y` suffices.
function bracketIfNecessary(a) {
  if (a.length === 1) {
    return `${a}`;
  }
  return `[${a.join(', ')}]`;
}

function generateLibraryFunctions() {
  function generateLibraryStub(name, params, body) {
    const entity = InitialContext.declarations[name];
    emit(`function ${jsName(entity)}(${params}) {${body}}`);
  }
  // This is sloppy. There should be a better way to do this.
  generateLibraryStub('print', '_', 'console.log(_);');
  generateLibraryStub('sqrt', '_', 'return Math.sqrt(_);');
}

const createListAsString = (acc, current, i) => ((i === 0) ? `${current}` : `${acc}, ${current}`);

Object.assign(MatrixExpression.prototype, {
  gen() {
    const values = this.values.map(v => v.gen());
    return `[${values.reduce(createListAsString, '')}]`;
  },
});

Object.assign(DictionaryExpression.prototype, {
  gen() {
    const keyValuePairArray = this.values.map(v => `${v.key.gen()}: ${v.value.gen()}`);
    return `{${keyValuePairArray.reduce(createListAsString, '')}}`;
  },
});

Object.assign(BinaryExpression.prototype, {
  gen() { return `(${this.left.gen()} ${makeOp(this.op)} ${this.right.gen()})`; },
});

Object.assign(BooleanLiteral.prototype, {
  gen() { return `${this.value}`; },
});

// Object.assign(BreakStatement.prototype, {
//   gen() { return 'break;'; },
// });

// Object.assign(CallStatement.prototype, {
//   gen() { emit(`${this.call.gen()};`); },
// });

// Object.assign(Call.prototype, {
//   gen() {
//     const fun = this.callee.referent;
//     const params = {};
//     const args = Array(this.args.length).fill(undefined);
//     fun.params.forEach((p, i) => { params[p.id] = i; });
//     this.args.forEach((a, i) => { args[a.isPositionalArgument ? i : params[a.id]] = a; });
//     return `${jsName(fun)}(${args.map(a => (a ? a.gen() : 'undefined')).join(', ')})`;
//   },
// });

Object.assign(FunctionCallExpression.prototype, {
  gen() {
    const fun = this.callee;
    return `${jsName(fun)}(${this.args.map(a => (a ? a.gen() : 'undefined')).join(', ')})`;
  },
});

// Object.assign(FunctionDeclaration.prototype, {
//   gen() { return this.function.gen(); },
// });
//
// Object.assign(FunctionObject.prototype, {
//   gen() {
//     emit(`function ${jsName(this)}(${this.params.map(p => p.gen()).join(', ')}) {`);
//     genStatementList(this.body);
//     emit('}');
//   },
// });

Object.assign(IdExpression.prototype, {
  gen() { return this.referent.gen(); },
});

Object.assign(IfStatement.prototype, {
  gen() {
    this.cases.forEach((c, index) => {
      const prefix = index === 0 ? 'if' : '} else if';
      emit(`${prefix} (${c.test.gen()}) {`);
      genStatementList(c.body);
    });
    if (this.alternate) {
      emit('} else {');
      genStatementList(this.alternate);
    }
    emit('}');
  },
});

Object.assign(NumberLiteral.prototype, {
  gen() { return `${this.value}`; },
});

// Object.assign(Parameter.prototype, {
//   gen() {
//     let translation = jsName(this);
//     if (this.defaultExpression) {
//       translation += ` = ${this.defaultExpression.gen()}`;
//     }
//     return translation;
//   },
// });

Object.assign(Program.prototype, {
  gen() {
    generateLibraryFunctions();
    this.block.gen();
  },
});

Object.assign(Block.prototype, {
  gen() {
    this.statements.forEach((statement) => {
      statement.gen();
    });
  },
});

Object.assign(ExpressionStatement.prototype, {
  gen() { emit(`${this.body.gen()};`); },
});

Object.assign(ReturnStatement.prototype, {
  gen() {
    if (this.returnValue) { // TODO: implement returnValue getter in olive
      emit(`return ${this.returnValue.gen()};`);
    } else {
      emit('return;');
    }
  },
});

Object.assign(StringLiteral.prototype, {
  gen() { return `${this.value}`; },
});

Object.assign(SubscriptExpression.prototype, {
  gen() {
    const base = this.iterable.gen();
    const subscript = this.subscript.gen();
    return `${base}[${subscript}]`;
  },
});

Object.assign(UnaryExpression.prototype, {
  gen() { return `(${makeOp(this.op)} ${this.operand.gen()})`; },
});

Object.assign(ImmutableBinding.prototype, {
  gen() {
    const variables = this.target.map(t => t.gen());
    const initializers = this.source.map(s => s.gen());
    emit(`const ${bracketIfNecessary(variables)} = ${bracketIfNecessary(initializers)};`);
  },
});

Object.assign(MutableBinding.prototype, {
  gen() {
    const targets = this.target.map(t => t.gen());
    const sources = this.source.map(s => s.gen());
    if (this.isAVariableDeclaration) {
      emit(`let ${bracketIfNecessary(targets)} = ${bracketIfNecessary(sources)};`);
    } else {
      emit(`${bracketIfNecessary(targets)} = ${bracketIfNecessary(sources)};`);
    }
  },
});

Object.assign(WhileStatement.prototype, {
  gen() {
    emit(`while (${this.condition.gen()}) {`);
    genStatementList(this.body.statements);
    emit('}');
  },
});

Object.assign(Variable.prototype, {
  gen() { return jsName(this); },
});

Object.assign(FunctionVariable.prototype, {
  gen() { return jsName(this); },
});