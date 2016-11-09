---
title: 【Go语言】基本类型排序和 slice 排序
layout: post
date: 2016-09-07 16:36:00
comments: true
tags: [Go语言]
categories: [Go语言]
keywords: Go语言
---

> Go 是通过 sort 包提供排序和搜索，因为 Go 暂时不支持泛型（将来也不好说支不支持），所以，Go 的 sort 和 search 使用起来跟类型是有关的，或是需要像 c 一样写比较函数等，稍微显得也不是很方便。

### **引言**

  Go 的排序思路和 C 和 C++ 有些差别。 C 默认是对数组进行排序， C++ 是对一个序列进行排序， Go 则更宽泛一些，待排序的可以是**`任何对象`**， 虽然很多情况下是一个 `slice` (分片， 类似于数组)，或是包含 slice 的一个对象。

排序(接口)的三个要素：

 - 待排序元素个数 n ；
 - 第 i 和第 j 个元素的比较函数 cmp ；
 - 第 i 和 第 j 个元素的交换 swap ；

乍一看条件 3 是多余的， c 和 c++ 都不提供 swap 。 c 的 qsort 的用法： `qsort(data, n, sizeof(int), cmp_int);`  data 是起始地址， n 是元素个数， sizeof(int) 是每个元素的大小， cmp_int 是一个比较两个 int 的函数。

c++ 的 sort 的用法： `sort(data, data+n, cmp_int);` data 是第一个元素的位置， data+n 是最后一个元素的下一个位置， cmp_int 是比较函数。

<!--more-->


### **基本类型排序(int、float64 和 string)**

#### **1、升序排序**

对于 int 、 float64 和 string 数组或是分片的排序， go 分别提供了 sort.Ints() 、 sort.Float64s() 和 sort.Strings() 函数， 默认都是从小到大排序。

```go
package main
 
import (
    "fmt"
    "sort"
)
 
func main() {
    intList := [] int {2, 4, 3, 5, 7, 6, 9, 8, 1, 0}
    float8List := [] float64 {4.2, 5.9, 12.3, 10.0, 50.4, 99.9, 31.4, 27.81828, 3.14}
    stringList := [] string {"a", "c", "b", "d", "f", "i", "z", "x", "w", "y"}
   
    sort.Ints(intList)
    sort.Float64s(float8List)
    sort.Strings(stringList)
   
    fmt.Printf("%v\n%v\n%v\n", intList, float8List, stringList)
 
}
```

#### **2、降序排序**

int 、 float64 和 string 都有默认的升序排序函数， 现在问题是如果降序如何 ？ 有其他语言编程经验的人都知道，只需要交换 cmp 的比较法则就可以了， go 的实现是类似的，然而又有所不同。 go 中对某个 Type 的对象 obj 排序， 可以使用 sort.Sort(obj) 即可，就是需要对 Type 类型绑定三个方法 ： **`Len()`** 求长度、**` Less(i,j)`**  比较第 i 和 第 j 个元素大小的函数、 **` Swap(i,j)`** 交换第 i 和第 j 个元素的函数。sort 包下的三个类型 `IntSlice` 、 `Float64Slice` 、 `StringSlice` 分别实现了这三个方法， 对应排序的是 [] int 、 [] float64 和 [] string 。如果期望逆序排序， 只需要将对应的 Less 函数简单修改一下即可。

go 的 sort 包可以使用 sort.Reverse(slice) 来调换 slice.Interface.Less ，也就是比较函数，所以， int 、 float64 和 string 的逆序排序函数可以这么写：

```go
package main
 
import (
    "fmt"
    "sort"
)
 
func main() {
    intList := [] int {2, 4, 3, 5, 7, 6, 9, 8, 1, 0}
    float8List := [] float64 {4.2, 5.9, 12.3, 10.0, 50.4, 99.9, 31.4, 27.81828, 3.14}
    stringList := [] string {"a", "c", "b", "d", "f", "i", "z", "x", "w", "y"}
   
    sort.Sort(sort.Reverse(sort.IntSlice(intList)))
    sort.Sort(sort.Reverse(sort.Float64Slice(float8List)))
    sort.Sort(sort.Reverse(sort.StringSlice(stringList)))
   
    fmt.Printf("%v\n%v\n%v\n", intList, float8List, stringList)
}
```

#### **3、深入理解排序**
sort 包中有一个 sort.Interface 接口，该接口有三个方法 Len() 、 Less(i,j) 和 Swap(i,j) 。 通用排序函数 sort.Sort 可以排序任何实现了 sort.Inferface 接口的对象(变量)。对于 [] int 、[] float64 和 [] string 除了使用特殊指定的函数外，还可以使用改装过的类型 IntSclice 、 Float64Slice 和 StringSlice ， 然后直接调用它们对应的 Sort() 方法；因为这三种类型也实现了 sort.Interface 接口， 所以可以通过 sort.Reverse 来转换这三种类型的 Interface.Less 方法来实现逆向排序， 这就是前面最后一个排序的使用。

下面使用了一个自定义(用户定义)的 Reverse 结构体， 而不是 sort.Reverse 函数， 来实现逆向排序。

```go
package main
 
import (
    "fmt"
    "sort"
)
 
// 自定义的 Reverse 类型
type Reverse struct {
    sort.Interface    // 这样，Reverse可以接纳任何实现了sort.Interface的对象
}
 
// Reverse 只是将其中的 Inferface.Less 的顺序对调了一下
func (r Reverse) Less(i, j int) bool {
    return r.Interface.Less(j, i)
}
 
func main() {
    ints := []int{5, 2, 6, 3, 1, 4}
 
    sort.Ints(ints)                                     // 特殊排序函数，升序
    fmt.Println("after sort by Ints:\t", ints)
 
    doubles := []float64{2.3, 3.2, 6.7, 10.9, 5.4, 1.8}
 
    sort.Float64s(doubles)
    fmt.Println("after sort by Float64s:\t", doubles)   // [1.8 2.3 3.2 5.4 6.7 10.9]
 
    strings := []string{"hello", "good", "students", "morning", "people", "world"}
    sort.Strings(strings)
    fmt.Println("after sort by Strings:\t", strings)    // [good hello mornig people students world]
 
    ipos := sort.SearchInts(ints, -1)    // int 搜索
    fmt.Printf("pos of 5 is %d th\n", ipos)
 
    dpos := sort.SearchFloat64s(doubles, 20.1)    // float64 搜索
    fmt.Printf("pos of 5.0 is %d th\n", dpos)
 
    fmt.Printf("doubles is asc ? %v\n", sort.Float64sAreSorted(doubles))
 
    doubles = []float64{3.5, 4.2, 8.9, 100.98, 20.14, 79.32}
    // sort.Sort(sort.Float64Slice(doubles))    // float64 排序方法 2
    // fmt.Println("after sort by Sort:\t", doubles)    // [3.5 4.2 8.9 20.14 79.32 100.98]
    (sort.Float64Slice(doubles)).Sort()         // float64 排序方法 3
    fmt.Println("after sort by Sort:\t", doubles)       // [3.5 4.2 8.9 20.14 79.32 100.98]
 
    sort.Sort(Reverse{sort.Float64Slice(doubles)})    // float64 逆序排序
    fmt.Println("after sort by Reversed Sort:\t", doubles)      // [100.98 79.32 20.14 8.9 4.2 3.5]
}
```

sort.Ints / sort.Float64s / sort.Strings 分别来对整型/浮点型/字符串型**`slice`**进行排序。然后是有个测试是否有序的函数。还有分别对应的 search 函数，不过，发现搜索函数只能定位到如果存在的话的位置，不存在的话，位置是不对的。

关于一般的数组排序，程序中显示了，有 3 种方法！目前提供的三种类型 int，float64 和 string 呈现对称的，也就是你有的，对应的我也有。关于翻转排序或是逆向排序，就是用个**翻转结构体**，重写 `Less()` 函数即可。上面的 Reverse 是个通用的结构体。

上面说了那么多， 只是对基本类型进行排序， 该到说说 struct 结构体类型的排序的时候了， 实际中这个用得到的会更多。



### **结构体类型的排序**

结构体类型的排序是通过使用 `sort.Sort(slice)` 实现的， 只要 slice 实现了 sort.Interface 的三个方法就可以。 虽然这么说，但是排序的方法却有那么好几种。首先一种就是模拟排序 [] int 构造对应的 IntSlice 类型，然后对 IntSlice 类型实现 Interface 的三个方法。

#### **1、模拟 IntSlice 排序**

```go
package main
 
import (
    "fmt"
    "sort"
)
 
type Person struct {
    Name string
    Age  int
}
 
// 按照 Person.Age 从大到小排序
type PersonSlice [] Person
 
func (a PersonSlice) Len() int {    	 // 重写 Len() 方法
    return len(a)
}
func (a PersonSlice) Swap(i, j int){     // 重写 Swap() 方法
    a[i], a[j] = a[j], a[i]
}
func (a PersonSlice) Less(i, j int) bool {    // 重写 Less() 方法， 从大到小排序
    return a[j].Age < a[i].Age
}
 
func main() {
    people := [] Person{
        {"zhang san", 12},
        {"li si", 30},
        {"wang wu", 52},
        {"zhao liu", 26},
    }
 
    fmt.Println(people)
 
    sort.Sort(PersonSlice(people))    // 按照 Age 的逆序排序
    fmt.Println(people)
 
    sort.Sort(sort.Reverse(PersonSlice(people)))    // 按照 Age 的升序排序
    fmt.Println(people)
 
}
```
这完全是一种模拟的方式，所以如果懂了 IntSlice 自然就理解这里了，反过来，理解了这里那么 IntSlice 那里也就懂了。

这种方法的缺点是：根据 Age 排序需要重新定义 PersonSlice 方法，绑定 Len 、 Less 和 Swap 方法， 如果需要根据 Name 排序， 又需要重新写三个函数； 如果结构体有 4 个字段，有四种类型的排序，那么就要写 3 × 4 = 12 个方法， 即使有一些完全是多余的， O__O"… 仔细思量一下，根据不同的标准 Age 或是 Name， 真正不同的体现在 Less 方法上，所以可以将 Less 抽象出来， 每种排序的 Less 让其变成动态的，比如下面一种方法。

#### **2、封装成 Wrapper**
```go
package main
 
import (
    "fmt"
    "sort"
)
 
type Person struct {
    Name string
    Age  int
}
 
type PersonWrapper struct {					//注意此处
    people [] Person
    by func(p, q * Person) bool
}
 
func (pw PersonWrapper) Len() int {    		// 重写 Len() 方法
    return len(pw.people)
}
func (pw PersonWrapper) Swap(i, j int){     // 重写 Swap() 方法
    pw.people[i], pw.people[j] = pw.people[j], pw.people[i]
}
func (pw PersonWrapper) Less(i, j int) bool {    // 重写 Less() 方法
    return pw.by(&pw.people[i], &pw.people[j])
}
 
func main() {
    people := [] Person{
        {"zhang san", 12},
        {"li si", 30},
        {"wang wu", 52},
        {"zhao liu", 26},
    }
 
    fmt.Println(people)
 
    sort.Sort(PersonWrapper{people, func (p, q *Person) bool {
        return q.Age < p.Age    // Age 递减排序
    }})
 
    fmt.Println(people)
    sort.Sort(PersonWrapper{people, func (p, q *Person) bool {
        return p.Name < q.Name    // Name 递增排序
    }})
 
    fmt.Println(people)
 
}
```
这种方法将 [] Person 和比较的准则 cmp 封装在了一起，形成了 PersonWrapper 函数，然后在其上绑定 Len 、 Less 和 Swap 方法。 实际上 sort.Sort(pw) 排序的是 pw 中的 people， 这就是前面说的， **go 的排序未必就是针对的一个数组或是 slice， 而可以是一个对象中的数组或是 slice** 。

#### **3、进一步封装**

感觉方法 2 已经很不错了， 唯一一个缺点是，在 main 中使用的时候暴露了 sort.Sort 的使用，还有就是 PersonWrapper 的构造。 为了让 main 中使用起来更为方便， me 们可以再简单的封装一下， 构造一个 SortPerson 方法， 如下：

```go
package main
 
import (
    "fmt"
    "sort"
)
 
type Person struct {
    Name string
    Age  int
}
 
type PersonWrapper struct {
    people [] Person
    by func(p, q * Person) bool
}
 
type SortBy func(p, q *Person) bool
 
func (pw PersonWrapper) Len() int {    		// 重写 Len() 方法
    return len(pw.people)
}
func (pw PersonWrapper) Swap(i, j int){         // 重写 Swap() 方法
    pw.people[i], pw.people[j] = pw.people[j], pw.people[i]
}
func (pw PersonWrapper) Less(i, j int) bool {    // 重写 Less() 方法
    return pw.by(&pw.people[i], &pw.people[j])
}
 
// 封装成 SortPerson 方法
func SortPerson(people [] Person, by SortBy){
    sort.Sort(PersonWrapper{people, by})
}
 
func main() {
    people := [] Person{
        {"zhang san", 12},
        {"li si", 30},
        {"wang wu", 52},
        {"zhao liu", 26},
    }
 
    fmt.Println(people)
 
    sort.Sort(PersonWrapper{people, func (p, q *Person) bool {
        return q.Age < p.Age    // Age 递减排序
    }})
 
    fmt.Println(people)
 
    SortPerson(people, func (p, q *Person) bool {
        return p.Name < q.Name    // Name 递增排序
    })
 
    fmt.Println(people)
 
}
```
在方法 2 的基础上构造了 SortPerson 函数，使用的时候传过去一个 [] Person 和一个 cmp 函数。

#### **4、另一种思路**

```go
package main
 
import (
    "fmt"
    "sort"
)
 
type Person struct {
    Name        string
    Weight      int
}
 
type PersonSlice []Person
 
func (s PersonSlice) Len() int  { return len(s) }
func (s PersonSlice) Swap(i, j int)     { s[i], s[j] = s[j], s[i] }
 
type ByName struct{ PersonSlice }    // 将 PersonSlice 包装起来到 ByName 中
 
func (s ByName) Less(i, j int) bool     { return s.PersonSlice[i].Name < s.PersonSlice[j].Name }    // 将 Less 绑定到 ByName 上
 
 
type ByWeight struct{ PersonSlice }    // 将 PersonSlice 包装起来到 ByWeight 中
func (s ByWeight) Less(i, j int) bool   { return s.PersonSlice[i].Weight < s.PersonSlice[j].Weight }    // 将 Less 绑定到 ByWeight 上
 
func main() {
    s := []Person{
        {"apple", 12},
        {"pear", 20},
        {"banana", 50},
        {"orange", 87},
        {"hello", 34},
        {"world", 43},
    }
 
    sort.Sort(ByWeight{s})
    fmt.Println("People by weight:")
    printPeople(s)
 
    sort.Sort(ByName{s})
    fmt.Println("\nPeople by name:")
    printPeople(s)
 
}
 
func printPeople(s []Person) {
    for _, o := range s {
        fmt.Printf("%-8s (%v)\n", o.Name, o.Weight)
    }
}
```

对结构体的排序， 暂时就到这里。 第一种排序对只根据一个字段的比较合适， 另外三个是针对可能根据多个字段排序的。方法 4 我认为每次都要多构造一个 ByXXX ， 颇为不便， 这样多麻烦，不如方法 2 和方法 3 来的方便，直接传进去一个 cmp。 方法2、 3 没有太大的差别， 3 只是简单封装了一下而已， 对于使用者来说， 可能会更方便一些，而且也会更少的出错。




#### **参考资料：**
1、[go语言的排序和搜索](http://ilovers.sinaapp.com/node/38)

